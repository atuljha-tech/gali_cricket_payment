import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Payment from '@/models/Payment'
import Settings from '@/models/Settings'
import Transaction from '@/models/Transaction'
import IncomeTransaction from '@/models/IncomeTransaction'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard
 * Public endpoint — no auth required.
 *
 * Revenue definitions (after DB cleanup via /api/fix-payments):
 *   - Each payment transaction creates exactly ONE payment record.
 *   - paidAmount = actual cash received for that transaction (e.g. ₹30 or ₹100).
 *   - total      = amount allocated to that specific month (always = monthlyFee when paid).
 *
 * Total revenue   = SUM of paidAmount across all paid records
 *                   grouped by sourcePaymentId (deduped) so a ₹100 payment that
 *                   still has legacy multi-month records counts only once.
 *
 * Month revenue   = SUM of paidAmount for unique transactions whose *first* record
 *                   falls in this month.
 *                   16 × ₹30  + 1 × ₹100 = ₹580 for July.
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const reqMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
    const reqYear  = searchParams.get('year')  ? parseInt(searchParams.get('year')!)  : null

    const currentMonth = now.getMonth() + 1
    const currentYear  = now.getFullYear()
    const month = reqMonth ?? currentMonth
    const year  = reqYear  ?? currentYear

    const isMonthWise = !!(reqMonth || reqYear)

    // Parallel queries
    const [players, monthPayments, revenueAgg, monthRevenueAgg, totalIncomeAgg, monthIncomeAgg, totalSpentResult, monthTransactions, settingsDoc] = await Promise.all([
      Player.find({ active: true }).lean<Array<{ _id: unknown }>>(),

      // All payment records for the selected month (paid or partial)
      Payment.find({ month, year, status: { $in: ['paid', 'partial'] } })
        .select('playerId status paidAmount')
        .lean<Array<{ playerId: unknown; status: string; paidAmount?: number }>>(),

      // ── Total revenue (all-time) ─────────────────────────────────────────────
      // Use paidAmount when set (new records), fall back to total (old records).
      // Deduplicate by sourcePaymentId so legacy multi-month records don't double-count.
      Payment.aggregate([
        { $match: { status: { $in: ['paid', 'partial'] } } },
        {
          $group: {
            _id: { $ifNull: ['$sourcePaymentId', { $toString: '$_id' }] },
            // Use paidAmount if set and > 0, otherwise use total (old records)
            cash: {
              $first: {
                $cond: [
                  { $and: [{ $ifNull: ['$paidAmount', false] }, { $gt: ['$paidAmount', 0] }] },
                  '$paidAmount',
                  '$total',
                ],
              },
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$cash' } } },
      ]),

      // ── Month revenue ────────────────────────────────────────────────────────
      // For each unique transaction (by sourcePaymentId), take the LOWEST month
      // (year*100+month) as the "target month" — that's when the cash was received.
      // Count its cash (paidAmount or total) only if that lowest month = queried month.
      Payment.aggregate([
        { $match: { status: { $in: ['paid', 'partial'] } } },
        {
          $group: {
            _id:          { $ifNull: ['$sourcePaymentId', { $toString: '$_id' }] },
            minYearMonth: { $min: { $add: [{ $multiply: ['$year', 100] }, '$month'] } },
            cash: {
              $first: {
                $cond: [
                  { $and: [{ $ifNull: ['$paidAmount', false] }, { $gt: ['$paidAmount', 0] }] },
                  '$paidAmount',
                  '$total',
                ],
              },
            },
          },
        },
        { $match: { minYearMonth: { $eq: year * 100 + month } } },
        { $group: { _id: null, total: { $sum: '$cash' } } },
      ]),

      // Total fund income (all-time)
      IncomeTransaction.aggregate([{ $group: { _id: null, sum: { $sum: '$amount' } } }]),

      // Fund income for the selected month only
      IncomeTransaction.aggregate([
        {
          $match: {
            date: {
              $gte: new Date(year, month - 1, 1),
              $lt:  new Date(year, month, 1),
            },
          },
        },
        { $group: { _id: null, sum: { $sum: '$amount' } } },
      ]),

      // Total expenses (all-time)
      Transaction.aggregate([{ $group: { _id: null, sum: { $sum: '$amount' } } }]),

      // Expenses for the selected month only
      Transaction.aggregate([
        {
          $match: {
            date: {
              $gte: new Date(year, month - 1, 1),
              $lt:  new Date(year, month, 1),
            },
          },
        },
        { $group: { _id: null, sum: { $sum: '$amount' } } },
      ]),

      Settings.findOne().select('monthlyFee').lean<{ monthlyFee: number } | null>(),
    ])

    const totalPlayers  = players.length
    const paidCount     = monthPayments.filter(p => p.status === 'paid').length
    const pendingCount  = totalPlayers - paidCount

    // ₹580 = 16×₹30 + 1×₹100 (each transaction counted once)
    const totalRevenue  = revenueAgg[0]?.total   ?? 0
    const monthRevenue  = monthRevenueAgg[0]?.total ?? 0
    const totalIncome   = totalIncomeAgg[0]?.sum ?? 0
    const monthIncome   = monthIncomeAgg[0]?.sum ?? 0

    const totalSpent       = totalSpentResult[0]?.sum  ?? 0
    const monthSpent       = monthTransactions[0]?.sum ?? 0
    const availableBalance = totalRevenue + totalIncome - totalSpent

    const monthlyFee         = settingsDoc?.monthlyFee ?? 30
    const expectedCollection = monthRevenue + pendingCount * monthlyFee

    // Money-based collection % — ₹580/₹690 = 84% (not player count based)
    const moneyCollectionPct = expectedCollection > 0
      ? Math.round((monthRevenue / expectedCollection) * 100)
      : 0

    // Player-based % — for the ring and "players paid" pill
    const playerPaidPct = totalPlayers > 0
      ? Math.round((paidCount / totalPlayers) * 100)
      : 0

    return NextResponse.json({
      // Common
      totalPlayers,
      paidCount,
      pendingCount,
      month,
      year,
      currentMonth,
      currentYear,

      // Overall (default view)
      totalCollection:    totalRevenue + totalIncome,
      totalSpent,
      availableBalance,
      totalIncome,

      // Month-wise
      thisMonthCollection:  monthRevenue + monthIncome,
      expectedCollection,
      monthSpent,
      monthIncome,
      monthNetBalance:      monthRevenue + monthIncome - monthSpent,
      collectionPct:        moneyCollectionPct,   // ₹ collected / ₹ expected
      playerPaidPct,                               // players paid / total players (for ring/pill)

      // No fine system
      lateCount: 0,
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
