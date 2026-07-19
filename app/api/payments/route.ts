import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Payment from '@/models/Payment'
import ReceiptSequence from '@/models/ReceiptSequence'
import Player from '@/models/Player'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'
import { generateReceiptNo } from '@/lib/fineCalculator'
import { isBeforeFeeStart } from '@/lib/feeConfig'
import mongoose from 'mongoose'
import { allocatePayment } from '@/lib/paymentAllocation'

export const dynamic = 'force-dynamic'

const MAX_RECEIPT_ATTEMPTS = 5

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 11000
}

async function nextReceiptNo(year: number): Promise<string> {
  const prefix = `CRICKET-${year}-`
  const receipts = await Payment.find({ receiptNo: { $regex: `^${prefix}\\d+$` } })
    .select('receiptNo')
    .lean<Array<{ receiptNo?: string }>>()

  const highestExistingSequence = receipts.reduce((highest, payment) => {
    if (!payment.receiptNo) return highest
    const sequenceStr = payment.receiptNo.slice(prefix.length)
    const sequence = Number(sequenceStr)
    return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest
  }, 0)

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
    const year  = searchParams.get('year')  ? parseInt(searchParams.get('year')!)  : undefined
    const page  = parseInt(searchParams.get('page')  || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const query: Record<string, unknown> = {}
    if (month) query.month = month
    if (year)  query.year  = year

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

/**
 * POST /api/payments — admin marks payment for a player
 *
 * Body:
 *   playerId  : string
 *   amount    : number  (actual cash received, e.g. 100)
 *   month     : number  (the starting month, 1–12)
 *   year      : number
 */
export async function POST(req: NextRequest) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const { playerId, month, year, amount } = body

    if (!playerId || month === undefined || year === undefined) {
      return NextResponse.json({ error: 'playerId, month, year required' }, { status: 400 })
    }

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 9999) {
      return NextResponse.json({ error: 'month must be 1-12 and year must be valid' }, { status: 400 })
    }

    if (isBeforeFeeStart(year, month)) {
      return NextResponse.json({ error: 'The fee structure started in July 2026 — earlier months are not applicable.' }, { status: 400 })
    }

    const [player, settings] = await Promise.all([
      Player.findById(playerId),
      Settings.findOne().lean<{ monthlyFee: number; dueDate: number } | null>(),
    ])

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const monthlyFee = settings?.monthlyFee ?? 30
    const paidAmount = typeof amount === 'number' && amount > 0 ? amount : monthlyFee
    const now = new Date()
    const sourceId = new mongoose.Types.ObjectId().toString()
    const existingCredit = player.creditBalance ?? 0
    const existingDue = player.dueBalance ?? 0

    // Find existing partial payment (oldest first)
    const existingPartial = await Payment.findOne({
      playerId, status: 'partial'
    }).sort({ year: 1, month: 1 }).lean() as any

    // Determine start month
    let startMonth = month
    let startYear = year
    if (existingPartial) {
      startMonth = existingPartial.month
      startYear = existingPartial.year
    }

    // Get allocation plan
    const allocation = allocatePayment(paidAmount, existingCredit, existingDue, startMonth, startYear, monthlyFee)

    let remainingPool = paidAmount + existingCredit
    let remainingDue = allocation.dueRemaining

    // Step 1: Settle existing partial if needed
    if (existingPartial) {
      const settleAmount = Math.min(remainingPool, existingDue)
      remainingPool -= settleAmount

      if (remainingDue === 0) {
        // Fully settle partial → mark as paid
        for (let attempt = 0; attempt < MAX_RECEIPT_ATTEMPTS; attempt++) {
          try {
            const receiptNo = await nextReceiptNo(existingPartial.year)
            await Payment.findByIdAndUpdate(existingPartial._id, {
              $set: {
                amount: monthlyFee,
                total: monthlyFee,
                status: 'paid',
                receiptNo,
                adminId: admin.id,
                paidAt: now,
                paidAmount,
                sourcePaymentId: sourceId,
              },
            })
            break
          } catch (err) {
            if (!isDuplicateKeyError(err)) throw err
          }
        }
      } else {
        // Still partial, update amount
        await Payment.findByIdAndUpdate(existingPartial._id, {
          $set: {
            amount: monthlyFee - remainingDue,
            total: monthlyFee - remainingDue,
            adminId: admin.id,
            paidAt: now,
            paidAmount,
            sourcePaymentId: sourceId,
          },
        })
      }
    }

    // Step 2: Process all allocated months
    for (const alloc of allocation.months) {
      // Skip if we already handled the partial month
      if (existingPartial && alloc.month === existingPartial.month && alloc.year === existingPartial.year) continue

      // Check if already paid
      const alreadyPaid = await Payment.findOne({
        playerId, month: alloc.month, year: alloc.year, status: 'paid'
      }).lean()
      if (alreadyPaid) continue

      if (alloc.status === 'paid') {
        // Full payment for month
        for (let attempt = 0; attempt < MAX_RECEIPT_ATTEMPTS; attempt++) {
          try {
            const receiptNo = await nextReceiptNo(alloc.year)
            await Payment.findOneAndUpdate(
              { playerId, month: alloc.month, year: alloc.year },
              {
                $set: {
                  amount: monthlyFee,
                  fine: 0,
                  total: monthlyFee,
                  status: 'paid',
                  receiptNo,
                  adminId: admin.id,
                  paidAt: now,
                  paidAmount,
                  sourcePaymentId: sourceId,
                },
                $setOnInsert: { playerId, month: alloc.month, year: alloc.year },
              },
              { upsert: true, new: true, runValidators: true }
            )
            remainingPool -= monthlyFee
            break
          } catch (err) {
            if (!isDuplicateKeyError(err)) throw err
            const concurrentPaid = await Payment.findOne({
              playerId, month: alloc.month, year: alloc.year, status: 'paid'
            }).lean()
            if (concurrentPaid) break
          }
        }
      } else if (alloc.status === 'partial') {
        // Partial payment for month
        await Payment.findOneAndUpdate(
          { playerId, month: alloc.month, year: alloc.year },
          {
            $set: {
              amount: alloc.amountApplied,
              fine: 0,
              total: alloc.amountApplied,
              status: 'partial',
              adminId: admin.id,
              paidAt: now,
              paidAmount,
              sourcePaymentId: sourceId,
            },
            $setOnInsert: { playerId, month: alloc.month, year: alloc.year },
          },
          { upsert: true, new: true, runValidators: true }
        )
      }
    }

    // Step 3: Set final balances
    const newCredit = remainingPool
    const advanceMonths = Math.floor(newCredit / monthlyFee)
    const creditRemainder = newCredit - advanceMonths * monthlyFee

    await Player.findByIdAndUpdate(playerId, {
      $set: {
        creditBalance: newCredit,
        dueBalance: remainingDue,
      },
    })

    // Build response summary
    const summary = {
      paidAmount,
      creditUsed: existingCredit,
      newCredit,
      newDue: remainingDue,
      advanceMonths,
      creditRemainder,
      allocations: allocation.months,
    }

    return NextResponse.json({ success: true, summary })
  } catch (err) {
    console.error('[payment] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
