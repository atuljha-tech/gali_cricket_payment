import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Payment from '@/models/Payment'
import Settings from '@/models/Settings'
import Admin from '@/models/Admin'
import { verifyRequestToken } from '@/lib/auth'
import { calculateFine } from '@/lib/fineCalculator'

export const dynamic = 'force-dynamic'

// GET /api/players — PUBLIC (home page) or admin
export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const search  = searchParams.get('search') || ''
    const month   = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year    = parseInt(searchParams.get('year')  || String(new Date().getFullYear()))

    const query: Record<string, unknown> = { active: true }
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    const [players, settings] = await Promise.all([
      Player.find(query).sort({ name: 1 }).lean<Array<{
        _id: unknown; name: string; phone?: string; email?: string; joiningDate: Date; active: boolean
      }>>(),
      Settings.findOne().lean<{ monthlyFee: number; dailyFine: number; dueDate: number } | null>(),
    ])

    const fee       = settings?.monthlyFee ?? 20
    const dailyFine = settings?.dailyFine  ?? 2
    const dueDate   = settings?.dueDate    ?? 10

    // Fetch payments for this month/year and populate adminId → name
    const playerIds = players.map(p => p._id)
    const payments  = await Payment.find({ playerId: { $in: playerIds }, month, year })
      .populate('adminId', 'name')
      .lean()

    const paymentMap = new Map(payments.map(p => [p.playerId.toString(), p]))

    const result = players.map(player => {
      const pay = paymentMap.get(String(player._id))
      const fine = pay?.status === 'paid'
        ? (pay.fine as number)
        : calculateFine(year, month, dueDate, dailyFine)
      return {
        _id:         player._id,
        name:        player.name,
        phone:       player.phone,
        email:       player.email,
        joiningDate: player.joiningDate,
        active:      player.active,
        payment: {
          _id:       pay?._id,
          status:    (pay?.status ?? 'pending') as 'paid' | 'pending',
          fine,
          amount:    (pay?.amount as number) ?? fee,
          total:     pay ? (pay.amount as number) + fine : fee + fine,
          paidAt:    pay?.paidAt as string | undefined,
          receiptNo: pay?.receiptNo as string | undefined,
          adminId:   pay?.adminId,
        },
      }
    })

    // Sort: paid players (most recently paid first) → pending players (alphabetical)
    result.sort((a, b) => {
      const aPaid = a.payment.status === 'paid'
      const bPaid = b.payment.status === 'paid'
      if (aPaid && !bPaid) return -1
      if (!aPaid && bPaid) return 1
      if (aPaid && bPaid) {
        const aTime = a.payment.paidAt ? new Date(a.payment.paidAt).getTime() : 0
        const bTime = b.payment.paidAt ? new Date(b.payment.paidAt).getTime() : 0
        return bTime - aTime
      }
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      players: result,
      settings: { monthlyFee: fee, dailyFine, dueDate },
    }, {
      headers: { 'Cache-Control': 's-maxage=20, stale-while-revalidate=40' }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/players — admin only
export async function POST(req: NextRequest) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const { name, phone, email, joiningDate } = await req.json()

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const player = await Player.create({
      name:        name.trim(),
      phone:       phone?.trim() || '',
      email:       email?.trim() || undefined,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      active:      true,
    })

    return NextResponse.json({ player }, { status: 201 })
  } catch (err: unknown) {
    const e = err as { code?: number }
    if (e.code === 11000) return NextResponse.json({ error: 'Player already exists' }, { status: 409 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Suppress unused import warning
void Admin
