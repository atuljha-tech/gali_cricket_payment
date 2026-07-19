import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Payment from '@/models/Payment'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/players/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()
    const player = await Player.findById(params.id).lean()
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const settings = await Settings.findOne().lean<{ monthlyFee: number; dueDate: number } | null>()
    const monthlyFee = settings?.monthlyFee ?? 30

    // All payments for this player, enriched with admin name
    const payments = await Payment.find({ playerId: params.id })
      .populate('adminId', 'name')
      .sort({ year: -1, month: -1 })
      .lean()

    // Group by sourcePaymentId to reconstruct transaction history
    const sourceGroups = new Map<string, typeof payments>()
    const noSource: typeof payments = []

    for (const p of payments) {
      const sid = (p as any).sourcePaymentId
      if (sid) {
        if (!sourceGroups.has(sid)) sourceGroups.set(sid, [])
        sourceGroups.get(sid)!.push(p)
      } else {
        noSource.push(p)
      }
    }

    // Build transaction history entries (each entry = one payment action)
    const transactionHistory: Array<{
      sourcePaymentId: string
      paidAt: Date | undefined
      paidAmount: number
      adminName: string
      months: Array<{
        month: number; year: number; status: string
        amountApplied: number
        receiptNo?: string
      }>
    }> = []

    for (const [sid, records] of Array.from(sourceGroups.entries())) {
      const first = records[0]
      const admin = first.adminId as any
      transactionHistory.push({
        sourcePaymentId: sid,
        paidAt:    first.paidAt ? new Date(first.paidAt as any) : undefined,
        paidAmount: (first as any).paidAmount ?? records.reduce((s, r) => s + (r.total ?? 0), 0),
        adminName: admin?.name ?? 'Admin',
        months: records.map(r => ({
          month:         r.month,
          year:          r.year,
          status:        r.status,
          amountApplied: r.amount ?? r.total,
          receiptNo:     r.receiptNo,
        })),
      })
    }

    // Sort by paidAt desc
    transactionHistory.sort((a, b) => {
      const aT = a.paidAt?.getTime() ?? 0
      const bT = b.paidAt?.getTime() ?? 0
      return bT - aT
    })

    // Add no-source payments as legacy entries
    for (const p of noSource) {
      const admin = p.adminId as any
      transactionHistory.push({
        sourcePaymentId: String(p._id),
        paidAt:    p.paidAt ? new Date(p.paidAt as any) : undefined,
        paidAmount: (p as any).paidAmount ?? p.total,
        adminName: admin?.name ?? 'Admin',
        months: [{
          month:         p.month,
          year:          p.year,
          status:        p.status,
          amountApplied: p.amount ?? p.total,
          receiptNo:     p.receiptNo,
        }],
      })
    }

    return NextResponse.json({
      player,
      payments,
      transactionHistory,
      settings: { monthlyFee },
      creditBalance: (player as any).creditBalance ?? 0,
      dueBalance:    (player as any).dueBalance    ?? 0,
    })
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

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const updateData: Record<string, unknown> = {
      name:  name.trim(),
      phone: phone?.trim()  || '',
      email: email?.trim()  || undefined,
    }
    if (joiningDate) updateData.joiningDate = new Date(joiningDate)
    if (active !== undefined) updateData.active = active

    const player = await Player.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    )
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    return NextResponse.json({ player })
  } catch (err) {
    console.error('[players] PUT error:', err)
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
