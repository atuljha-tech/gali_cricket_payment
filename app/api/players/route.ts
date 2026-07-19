import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Payment from '@/models/Payment'
import Settings from '@/models/Settings'
import Admin from '@/models/Admin'
import { verifyRequestToken } from '@/lib/auth'

// GET /api/players — PUBLIC (home page) or admin
export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const month  = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year   = parseInt(searchParams.get('year')  || String(new Date().getFullYear()))

    const query: Record<string, unknown> = { active: true }
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    }

    const [players, settings, payments, allPaidPayments] = await Promise.all([
      Player.find(query)
        .select('_id name phone email joiningDate active role battingStyle bowlingArm bowlingType jerseyNumber isCaptain creditBalance dueBalance')
        .sort({ name: 1 })
        .lean<Array<{
          _id: unknown; name: string; phone?: string; email?: string; joiningDate: Date; active: boolean
          role?: string; battingStyle?: string; bowlingArm?: string; bowlingType?: string
          jerseyNumber?: number; isCaptain?: boolean; creditBalance?: number; dueBalance?: number
        }>>(),
      Settings.findOne()
        .select('monthlyFee dueDate')
        .lean<{ monthlyFee: number; dueDate: number } | null>(),
      Payment.find({ month, year, status: { $in: ['paid', 'partial'] } })
        .select('playerId status amount total paidAt receiptNo adminId paidAmount')
        .populate('adminId', 'name')
        .lean(),
      // All-time paid months per player (for "X months paid" summary)
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: '$playerId', count: { $sum: 1 } } },
      ]),
    ])

    const fee = settings?.monthlyFee ?? 30

    const paymentMap = new Map<string, typeof payments[number]>()
    for (const payment of payments) {
      if (!payment.playerId) continue
      paymentMap.set(payment.playerId.toString(), payment)
    }

    // Build paid-months count map: playerId -> total months fully paid ever
    const paidMonthsMap = new Map<string, number>()
    for (const row of allPaidPayments) {
      paidMonthsMap.set(String(row._id), row.count as number)
    }
    const result = players.map(player => {
      const pay    = paymentMap.get(String(player._id))
      const status = pay?.status === 'paid' ? 'paid' : pay?.status === 'partial' ? 'partial' : 'pending'

      // lastPaidMonth: find the latest paid month for this player
      const credit = player.creditBalance ?? 0
      const due    = player.dueBalance    ?? 0
      // Compute advance months from credit balance (display only, no payment records)
      const advanceMonths    = Math.floor(credit / fee)
      const creditRemainder  = credit - advanceMonths * fee

      return {
        _id:          player._id,
        name:         player.name,
        phone:        player.phone,
        email:        player.email,
        joiningDate:  player.joiningDate,
        active:       player.active,
        role:          player.role        || '',
        battingStyle:  player.battingStyle || '',
        bowlingArm:    player.bowlingArm   || '',
        bowlingType:   player.bowlingType  || '',
        jerseyNumber:  player.jerseyNumber,
        isCaptain:     player.isCaptain    || false,
        creditBalance: credit,
        dueBalance:    due,
        advanceMonths,
        creditRemainder,
        paidMonthsCount: paidMonthsMap.get(String(player._id)) ?? 0,
        payment: {
          _id:       pay?._id,
          status,
          fine:      0,
          amount:    (pay?.amount as number) ?? fee,
          total:     pay ? (pay.total as number) : fee,
          paidAt:    pay?.paidAt  as string | undefined,
          receiptNo: pay?.receiptNo as string | undefined,
          adminId:   pay?.adminId,
        },
      }
    })

    // Sort: paid first (most recently paid), then pending alphabetical
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

    // Cache for 30 seconds, stale-while-revalidate 60 seconds for faster loads
    return NextResponse.json(
      { players: result, settings: { monthlyFee: fee } },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
    )
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
      name:         name.trim(),
      phone:        phone?.trim()  || '',
      email:        email?.trim()  || undefined,
      joiningDate:  joiningDate ? new Date(joiningDate) : new Date(),
      active:       true,
      creditBalance: 0,
      dueBalance:    0,
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
