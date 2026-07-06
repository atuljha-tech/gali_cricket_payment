import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Payment from '@/models/Payment'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'
import { calculateFine } from '@/lib/fineCalculator'

// GET /api/players/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()
    const player = await Player.findById(params.id).lean()
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const settings = await Settings.findOne().lean<{monthlyFee: number; dailyFine: number; dueDate: number} | null>()
    const dailyFine = settings?.dailyFine ?? 2
    const dueDate = settings?.dueDate ?? 10
    const monthlyFee = settings?.monthlyFee ?? 20

    // All payments for this player
    const payments = await Payment.find({ playerId: params.id })
      .sort({ year: -1, month: -1 })
      .lean()

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Enrich with live fine for pending current-month payment
    const enriched = payments.map((p) => {
      if (p.status === 'pending' && p.month === currentMonth && p.year === currentYear) {
        const fine = calculateFine(p.year, p.month, dueDate, dailyFine)
        return { ...p, fine, total: monthlyFee + fine }
      }
      return p
    })

    return NextResponse.json({ player, payments: enriched, settings: { monthlyFee, dailyFine, dueDate } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT /api/players/[id] — admin only
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const body = await req.json()
    const { name, phone, email, joiningDate, active } = body

    const player = await Player.findByIdAndUpdate(
      params.id,
      { name, phone, email, joiningDate, active },
      { new: true, runValidators: true }
    )
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    return NextResponse.json({ player })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/players/[id] — admin only (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    await Player.findByIdAndUpdate(params.id, { active: false })
    return NextResponse.json({ message: 'Player deactivated' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
