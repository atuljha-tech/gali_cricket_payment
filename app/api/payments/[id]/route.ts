import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Payment from '@/models/Payment'
import { verifyRequestToken } from '@/lib/auth'

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
    const payment = await Payment.findByIdAndDelete(params.id)
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    return NextResponse.json({ message: 'Payment undone' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
