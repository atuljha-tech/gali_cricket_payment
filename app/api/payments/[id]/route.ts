import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Payment from '@/models/Payment'
import Player from '@/models/Player'
import { verifyRequestToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/payments/[id] — get single payment (for receipt)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()
    const payment = await Payment.findById(params.id)
      .populate('playerId', 'name phone email')
      .populate('adminId', 'name')
      .lean()

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    return NextResponse.json({ payment })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/payments/[id] — undo payment (admin only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const payment = await Payment.findById(params.id).lean() as any
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    const playerId = payment.playerId

    // If this payment is part of a multi-month group, delete all of them
    const sourceId = (payment as any).sourcePaymentId
    if (sourceId) {
      await Payment.deleteMany({ sourcePaymentId: sourceId })
    } else {
      await Payment.findByIdAndDelete(params.id)
    }

    // Recalculate player's credit and due from remaining payments
    const remainingPayments = await Payment.find({ playerId }).lean()
    const partialRecord = remainingPayments.find(p => p.status === 'partial')
    const newDue    = partialRecord ? ((partialRecord as any).dueBalance ?? 0) : 0
    const newCredit = 0 // credit is recalculated on next payment

    await Player.findByIdAndUpdate(playerId, {
      $set: { creditBalance: newCredit, dueBalance: newDue },
    })

    return NextResponse.json({ message: 'Payment undone' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
