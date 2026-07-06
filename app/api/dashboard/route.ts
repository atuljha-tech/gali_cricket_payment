import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Payment from '@/models/Payment'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'
import { calculateFine } from '@/lib/fineCalculator'

export async function GET(req: NextRequest) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const [players, payments, settings] = await Promise.all([
      Player.find({ active: true }).lean<Array<{_id: unknown}>>(),
      Payment.find({ month, year }).lean<Array<{playerId: unknown; status: string; total: number}>>(),
      Settings.findOne().lean<{monthlyFee: number; dailyFine: number; dueDate: number} | null>(),
    ])

    const totalPlayers = players.length
    const paidCount = payments.filter((p) => p.status === 'paid').length
    const pendingCount = totalPlayers - paidCount

    const dailyFine = settings?.dailyFine ?? 2
    const dueDate = settings?.dueDate ?? 10
    const lateCount = players.filter((player) => {
      const payment = payments.find((p) => p.playerId?.toString() === String(player._id))
      if (payment?.status === 'paid') return false
      return calculateFine(year, month, dueDate, dailyFine) > 0
    }).length

    const thisMonthCollection = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.total, 0)

    const allPaidPayments = await Payment.find({ status: 'paid' }).lean<Array<{total: number}>>()
    const totalCollection = allPaidPayments.reduce((sum, p) => sum + p.total, 0)

    return NextResponse.json({
      totalPlayers,
      paidCount,
      pendingCount,
      lateCount,
      thisMonthCollection,
      totalCollection,
      month,
      year,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
