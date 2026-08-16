// app/api/income/route.ts
import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import IncomeTransaction from '@/models/IncomeTransaction'
import { verifyRequestToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/income — public
export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))

    const [transactions, total] = await Promise.all([
      IncomeTransaction.find({})
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      IncomeTransaction.countDocuments(),
    ])

    const totalIncome = await IncomeTransaction.aggregate([
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ])

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        ...t,
        _id: String(t._id),
        adminName: t.adminName || 'Unknown',
      })),
      totalIncome: totalIncome[0]?.sum ?? 0,
      total,
      page,
      pages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error('Error fetching income transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

// POST /api/income — admin only
export async function POST(req: NextRequest) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const { amount, reason, details, date, category, source } = await req.json()

    if (!amount || !reason || !date) {
      return NextResponse.json({ error: 'Amount, reason and date are required' }, { status: 400 })
    }

    const transaction = await IncomeTransaction.create({
      amount: Number(amount),
      reason: reason.trim(),
      details: details?.trim() || '',
      date: new Date(date),
      category: category || 'other',
      source: source?.trim() || '',
      adminId: admin.id,
      adminName: admin.name,
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error('Error creating income transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}