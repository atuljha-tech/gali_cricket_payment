import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import { verifyRequestToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/transactions — public
export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))

    const [transactions, total] = await Promise.all([
      Transaction.find({})
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(),
    ])

    const totalSpent = await Transaction.aggregate([
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ])

    return NextResponse.json({
      transactions,
      total,
      page,
      pages: Math.ceil(total / limit),
      totalSpent: totalSpent[0]?.sum ?? 0,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/transactions — admin only
export async function POST(req: NextRequest) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const { amount, reason, details, date, category } = await req.json()

    if (!amount || !reason || !date) {
      return NextResponse.json({ error: 'Amount, reason and date are required' }, { status: 400 })
    }

    const txn = await Transaction.create({
      amount:    Number(amount),
      reason:    reason.trim(),
      details:   details?.trim() || '',
      date:      new Date(date),
      adminId:   admin.id,
      adminName: admin.name,
      category:  category || 'other',
    })

    return NextResponse.json({ transaction: txn }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
