import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Payment from '@/models/Payment'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'
import { isBeforeFeeStart, applicableMonthCount, dueMonthCount } from '@/lib/feeConfig'

export const dynamic = 'force-dynamic'

interface MatrixCell {
  _id?: string
  status: 'paid' | 'pending' | 'partial' | 'none' | 'na'
  amount: number
  fine: number
  total: number
  receiptNo?: string
  paidAt?: string
  dueAmount?: number
}

/**
 * GET /api/payments/matrix?year=YYYY — admin only.
 * Returns every active player and their 12-month payment grid for the year.
 * Fine system has been removed — cells show 0 for fine.
 */
export async function GET(req: NextRequest) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const [players, settings, payments] = await Promise.all([
      Player.find({ active: true })
        .select('_id name phone joiningDate isCaptain creditBalance dueBalance')
        .sort({ name: 1 })
        .lean<Array<{ _id: unknown; name: string; phone?: string; joiningDate: Date; isCaptain?: boolean; creditBalance?: number; dueBalance?: number }>>(),
      Settings.findOne()
        .select('monthlyFee dueDate')
        .lean<{ monthlyFee: number; dueDate: number } | null>(),
      Payment.find({ year })
        .select('playerId month status amount total receiptNo paidAt')
        .lean(),
    ])

    const monthlyFee = settings?.monthlyFee ?? 30

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear  = now.getFullYear()

    // playerId -> month -> payment
    const payMap = new Map<string, Map<number, any>>()
    for (const p of payments) {
      const pid = String(p.playerId)
      if (!payMap.has(pid)) payMap.set(pid, new Map())
      payMap.get(pid)!.set(p.month, p)
    }

    const monthTotals = Array(13).fill(0) // 1..12
    const dueMonths   = dueMonthCount(year, currentYear, currentMonth)

    let outstanding   = 0
    let totalPaidCells = 0
    let fullyPaid      = 0

    const rows = players.map((player) => {
      const pid             = String(player._id)
      const playerPayments  = payMap.get(pid)
      let rowPaidTotal  = 0
      let rowPaidMonths = 0
      let rowPaidDue    = 0

      const cells: MatrixCell[] = []
      for (let m = 1; m <= 12; m++) {
        const pay = playerPayments?.get(m)

        if (pay?.status === 'paid') {
          rowPaidTotal  += pay.total
          rowPaidMonths += 1
          monthTotals[m] += pay.total
          totalPaidCells  += 1
          if (!isBeforeFeeStart(year, m)) {
            const isDue = year < currentYear || (year === currentYear && m <= currentMonth)
            if (isDue) rowPaidDue += 1
          }
          cells.push({
            _id:      String(pay._id),
            status:   'paid',
            amount:   pay.amount,
            fine:     0,
            total:    pay.total,
            receiptNo: pay.receiptNo,
            paidAt:   pay.paidAt,
          })
          continue
        }

        if (pay?.status === 'partial') {
          const dueAmount = monthlyFee - (pay.amount ?? 0)
          cells.push({
            _id:       String(pay._id),
            status:    'partial',
            amount:    pay.amount ?? 0,
            fine:      0,
            total:     pay.total,
            dueAmount,
          })
          continue
        }

        // N/A
        if (isBeforeFeeStart(year, m)) {
          cells.push({ status: 'na', amount: 0, fine: 0, total: 0 })
          continue
        }

        // Future month
        const isFuture = year > currentYear || (year === currentYear && m > currentMonth)
        if (isFuture) {
          cells.push({ status: 'none', amount: monthlyFee, fine: 0, total: monthlyFee })
          continue
        }

        // Unpaid past/current month
        outstanding += monthlyFee
        cells.push({ status: 'pending', amount: monthlyFee, fine: 0, total: monthlyFee })
      }

      if (dueMonths > 0 && rowPaidDue >= dueMonths) fullyPaid += 1

      return {
        _id:         pid,
        name:        player.name,
        phone:       player.phone || '',
        isCaptain:   player.isCaptain   || false,
        creditBalance: player.creditBalance ?? 0,
        dueBalance:    player.dueBalance    ?? 0,
        cells,
        paidMonths:  rowPaidMonths,
        paidTotal:   rowPaidTotal,
      }
    })

    const grandTotal = monthTotals.reduce((s, v) => s + v, 0)

    return NextResponse.json({
      year,
      players: rows,
      monthTotals:       monthTotals.slice(1),
      grandTotal,
      applicableMonths:  applicableMonthCount(year),
      summary: {
        collected:       grandTotal,
        outstanding,
        fullyPaid,
        totalPaidCells,
        playerCount:     rows.length,
      },
      settings:     { monthlyFee, dueDate: settings?.dueDate ?? 31 },
      currentMonth,
      currentYear,
      feeStart: { year: 2026, month: 7 },
    })
  } catch (err) {
    console.error('[matrix] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
