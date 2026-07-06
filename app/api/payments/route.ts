import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Payment from '@/models/Payment'
import Player from '@/models/Player'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'
import { calculateFine, generateReceiptNo } from '@/lib/fineCalculator'

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
    const { playerId, month, year } = await req.json()

    if (!playerId || !month || !year) {
      return NextResponse.json({ error: 'playerId, month, year required' }, { status: 400 })
    }

    const [player, settings] = await Promise.all([
      Player.findById(playerId),
      Settings.findOne().lean<{monthlyFee: number; dailyFine: number; dueDate: number} | null>(),
    ])
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const fee = settings?.monthlyFee ?? 20
    const dailyFine = settings?.dailyFine ?? 2
    const dueDate = settings?.dueDate ?? 10
    const now = new Date()

    const fine = calculateFine(year, month, dueDate, dailyFine, now)
    const total = fee + fine

    // Generate receipt number
    const count = await Payment.countDocuments({ receiptNo: { $exists: true, $ne: null } })
    const receiptNo = generateReceiptNo(year, count + 1)

    // Upsert payment
    const payment = await Payment.findOneAndUpdate(
      { playerId, month, year },
      {
        playerId,
        month,
        year,
        amount: fee,
        fine,
        total,
        status: 'paid',
        receiptNo,
        adminId: admin.id,
        paidAt: now,
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({ payment, receiptNo })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
