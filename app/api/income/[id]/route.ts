// app/api/income/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import IncomeTransaction from '@/models/IncomeTransaction'
import { verifyRequestToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// PUT /api/income/[id] — admin only
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const { amount, reason, details, date, category, source } = await req.json()

    if (!amount || !reason || !date) {
      return NextResponse.json({ error: 'Amount, reason and date are required' }, { status: 400 })
    }

    const transaction = await IncomeTransaction.findByIdAndUpdate(
      params.id,
      {
        amount: Number(amount),
        reason: reason.trim(),
        details: details?.trim() || '',
        date: new Date(date),
        category: category || 'other',
        source: source?.trim() || '',
        adminId: admin.id,
        adminName: admin.name,
      },
      { new: true }
    ).lean()

    if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating income transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

// DELETE /api/income/[id] — admin only
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    await IncomeTransaction.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting income transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}