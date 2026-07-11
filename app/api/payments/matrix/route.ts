import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Payment from '@/models/Payment'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'
import { calculateFine } from '@/lib/fineCalculator'
import { isBeforeFeeStart, applicableMonthCount, dueMonthCount } from '@/lib/feeConfig'

export const dynamic = 'force-dynamic'

interface MatrixCell {
  _id?: string
  status: 'paid' | 'pending' | 'none' | 'na'
  amount: number
  fine: number
  total: number
  receiptNo?: string
  paidAt?: string
}

/**
 * GET /api/payments/matrix?year=YYYY  — admin only.
 * Returns every active player and their 12-month payment grid for the year,
 * in just two DB queries. Months before the fee structure started (July 2026)
 * are returned as 'na' and never count toward dues or totals. The summary is
 * computed here so the client does no heavy work.
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
        .select('_id name phone joiningDate isCaptain')
        .sort({ name: 1 })
        .lean<Array<{ _id: unknown; name: string; phone?: string; joiningDate: Date; isCaptain?: boolean }>>(),
      Settings.findOne()
        .select('monthlyFee dailyFine dueDate')
        .lean<{ monthlyFee: number; dailyFine: number; dueDate: number } | null>(),
      Payment.find({ year })
        .select('playerId month status amount fine total receiptNo paidAt')
        .lean(),
    ])

    const monthlyFee = settings?.monthlyFee ?? 20
    const dailyFine = settings?.dailyFine ?? 2
    const dueDate = settings?.dueDate ?? 10

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // playerId -> month -> payment
    const payMap = new Map<string, Map<number, any>>()
    for (const p of payments) {
      const pid = String(p.playerId)
      if (!payMap.has(pid)) payMap.set(pid, new Map())
      payMap.get(pid)!.set(p.month, p)
    }

    const monthTotals = Array(13).fill(0) // 1..12
    const dueMonths = dueMonthCount(year, currentYear, currentMonth)

    // Aggregate summary
    let outstanding = 0
    let totalPaidCells = 0
    let fullyPaid = 0

    const rows = players.map((player) => {
      const pid = String(player._id)
      const playerPayments = payMap.get(pid)
      let rowPaidTotal = 0
      let rowPaidMonths = 0
      let rowPaidDue = 0 // paid months that are actually "due" (for fully-paid calc)

      const cells: MatrixCell[] = []
      for (let m = 1; m <= 12; m++) {
        const pay = playerPayments?.get(m)

        if (pay?.status === 'paid') {
          rowPaidTotal += pay.total
          rowPaidMonths += 1
          monthTotals[m] += pay.total
          totalPaidCells += 1
          if (!isBeforeFeeStart(year, m)) {
            const isDue = year < currentYear || (year === currentYear && m <= currentMonth)
            if (isDue) rowPaidDue += 1
          }
          cells.push({
            _id: String(pay._id),
            status: 'paid',
            amount: pay.amount,
            fine: pay.fine,
            total: pay.total,
            receiptNo: pay.receiptNo,
            paidAt: pay.paidAt,
          })
          continue
        }

        // Before the fee structure existed — not applicable, never a due.
        if (isBeforeFeeStart(year, m)) {
          cells.push({ status: 'na', amount: 0, fine: 0, total: 0 })
          continue
        }

        // Future month — fee applies but isn't due yet.
        const isFuture = year > currentYear || (year === currentYear && m > currentMonth)
        if (isFuture) {
          cells.push({ status: 'none', amount: monthlyFee, fine: 0, total: monthlyFee })
          continue
        }

        // Past or current unpaid month — this is a real outstanding due.
        const fine = calculateFine(year, m, dueDate, dailyFine)
        const total = monthlyFee + fine
        outstanding += total
        cells.push({
          _id: pay?._id ? String(pay._id) : undefined,
          status: 'pending',
          amount: monthlyFee,
          fine,
          total,
        })
      }

      if (dueMonths > 0 && rowPaidDue >= dueMonths) fullyPaid += 1

      return {
        _id: pid,
        name: player.name,
        phone: player.phone || '',
        isCaptain: player.isCaptain || false,
        cells,
        paidMonths: rowPaidMonths,
        paidTotal: rowPaidTotal,
      }
    })

    const grandTotal = monthTotals.reduce((s, v) => s + v, 0)

    return NextResponse.json({
      year,
      players: rows,
      monthTotals: monthTotals.slice(1), // Jan..Dec
      grandTotal,
      applicableMonths: applicableMonthCount(year),
      summary: {
        collected: grandTotal,
        outstanding,
        fullyPaid,
        totalPaidCells,
        playerCount: rows.length,
      },
      settings: { monthlyFee, dailyFine, dueDate },
      currentMonth,
      currentYear,
      feeStart: { year: 2026, month: 7 },
    })
  } catch (err) {
    console.error('[matrix] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
