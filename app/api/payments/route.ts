import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Payment from '@/models/Payment'
import ReceiptSequence from '@/models/ReceiptSequence'
import Player from '@/models/Player'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'
import { calculateFine, generateReceiptNo } from '@/lib/fineCalculator'

export const dynamic = 'force-dynamic'

const MAX_RECEIPT_ATTEMPTS = 5

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}

async function nextReceiptNo(year: number): Promise<string> {
  const prefix = `CRICKET-${year}-`
  const receipts = await Payment.find({ receiptNo: { $regex: `^${prefix}\\d+$` } })
    .select('receiptNo')
    .lean<Array<{ receiptNo?: string }>>()
  const highestExistingSequence = receipts.reduce((highest, payment) => {
    const sequence = Number(payment.receiptNo?.slice(prefix.length))
    return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest
  }, 0)

  // $max migrates pre-existing receipt numbers; $inc is atomic across requests.
  await ReceiptSequence.updateOne(
    { _id: String(year) },
    { $max: { sequence: highestExistingSequence } },
    { upsert: true }
  )
  const counter = await ReceiptSequence.findByIdAndUpdate(
    String(year),
    { $inc: { sequence: 1 } },
    { new: true, runValidators: true }
  ).lean<{ sequence: number } | null>()

  if (!counter) throw new Error('Could not allocate receipt number')
  return generateReceiptNo(year, counter.sequence)
}

// GET /api/payments — admin, all payments with pagination
export async function GET(req: NextRequest) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const query: Record<string, unknown> = {}
    if (month) query.month = month
    if (year) query.year = year

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('playerId', 'name phone')
        .populate('adminId', 'name')
        .sort({ paidAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ])

    return NextResponse.json({ payments, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/payments — admin marks payment as paid
export async function POST(req: NextRequest) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const body = await req.json().catch((err) => {
      console.error('[payment] Failed to parse JSON:', err)
      return null
    })

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { playerId, month, year } = body

    if (!playerId || month === undefined || year === undefined) {
      console.error('[payment] Missing required fields:', { playerId, month, year })
      return NextResponse.json({ error: 'playerId, month, year required' }, { status: 400 })
    }

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 9999) {
      return NextResponse.json({ error: 'month must be 1-12 and year must be valid' }, { status: 400 })
    }

    const [player, settings] = await Promise.all([
      Player.findById(playerId),
      Settings.findOne().lean<{monthlyFee: number; dailyFine: number; dueDate: number} | null>(),
    ])
    
    if (!player) {
      console.error('[payment] Player not found:', playerId)
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // A repeat click returns the original receipt instead of issuing another.
    const alreadyPaid = await Payment.findOne({ playerId, month, year, status: 'paid' })
    if (alreadyPaid) {
      return NextResponse.json({ payment: alreadyPaid, receiptNo: alreadyPaid.receiptNo })
    }

    const fee = settings?.monthlyFee ?? 20
    const dailyFine = settings?.dailyFine ?? 2
    const dueDate = settings?.dueDate ?? 10
    const now = new Date()

    const fine = calculateFine(year, month, dueDate, dailyFine, now)
    const total = fee + fine

    console.log('[payment] Marking payment - admin:', admin.id, 'player:', playerId, 'month:', month, 'year:', year)

    for (let attempt = 0; attempt < MAX_RECEIPT_ATTEMPTS; attempt++) {
      const receiptNo = await nextReceiptNo(year)
      try {
        // Do not replace a receipt if another request has already paid it.
        const payment = await Payment.findOneAndUpdate(
          { playerId, month, year, status: { $ne: 'paid' } },
          { $set: { amount: fee, fine, total, status: 'paid', receiptNo, adminId: admin.id, paidAt: now }, $setOnInsert: { playerId, month, year } },
          { upsert: true, new: true, runValidators: true }
        )

        if (payment) {
          console.log('[payment] Payment marked successfully:', payment._id)
          return NextResponse.json({ payment, receiptNo })
        }
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error

        const concurrentPayment = await Payment.findOne({ playerId, month, year, status: 'paid' })
        if (concurrentPayment) {
          return NextResponse.json({ payment: concurrentPayment, receiptNo: concurrentPayment.receiptNo })
        }
      }
    }

    return NextResponse.json({ error: 'Could not allocate a unique receipt number. Please try again.' }, { status: 503 })
  } catch (err) {
    console.error('[payment] Error:', err instanceof Error ? err.message : err)
    const errorMsg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: 'Server error', details: errorMsg }, { status: 500 })
  }
}
