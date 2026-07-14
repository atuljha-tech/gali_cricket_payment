import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Payment from '@/models/Payment'
import Settings from '@/models/Settings'
import Transaction from '@/models/Transaction'
import { calculateFine } from '@/lib/fineCalculator'

export const dynamic = 'force-dynamic'

// Public endpoint — no auth required so anyone can view the stats page
export async function GET() {
  try {
    await dbConnect()
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const [players, payments, allPaidPayments, settings, totalSpentResult] = await Promise.all([
      Player.find({ active: true }).lean<Array<{_id: unknown}>>(),
      Payment.find({ month, year }).lean<Array<{playerId: unknown; status: string; total: number}>>(),
      Payment.find({ status: 'paid' }).select('total').lean<Array<{total: number}>>(),
      Settings.findOne().lean<{monthlyFee: number; dailyFine: number; dueDate: number} | null>(),
      Transaction.aggregate([{ $group: { _id: null, sum: { $sum: '$amount' } } }]),
    ])

    const totalPlayers = players.length
    const paidCount = payments.filter((p) => p.status === 'paid').length
    const pendingCount = totalPlayers - paidCount

    const dailyFine = settings?.dailyFine ?? 2
    const dueDate = settings?.dueDate ?? 28
    const lateCount = players.filter((player) => {
      const payment = payments.find((p) => p.playerId?.toString() === String(player._id))
      if (payment?.status === 'paid') return false
      return calculateFine(year, month, dueDate, dailyFine) > 0
    }).length

    const thisMonthCollection = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.total, 0)

    const totalCollection = allPaidPayments.reduce((sum, p) => sum + p.total, 0)
    const totalSpent = totalSpentResult[0]?.sum ?? 0
    const availableBalance = totalCollection - totalSpent

    return NextResponse.json({
      totalPlayers,
      paidCount,
      pendingCount,
      lateCount,
      thisMonthCollection,
      totalCollection,
      totalSpent,
      availableBalance,
      month,
      year,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
