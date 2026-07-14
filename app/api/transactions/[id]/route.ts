import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/models/Transaction'
import { verifyRequestToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PUT /api/transactions/[id] — admin only
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const { amount, reason, details, date, category } = await req.json()

    if (!amount || !reason || !date) {
      return NextResponse.json({ error: 'Amount, reason and date are required' }, { status: 400 })
    }

    const txn = await Transaction.findByIdAndUpdate(
      params.id,
      {
        amount:    Number(amount),
        reason:    reason.trim(),
        details:   details?.trim() || '',
        date:      new Date(date),
        category:  category || 'other',
      },
      { new: true }
    ).lean()

    if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ transaction: txn })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/transactions/[id] — admin only
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    await Transaction.findByIdAndDelete(params.id)
    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
