/**
 * POST /api/fix-payments
 * One-time migration: cleans up the corrupt multi-month pre-allocation records
 * created by the old payment logic (which pre-created Aug/Sep records when ₹100
 * was paid in July).
 *
 * For every sourcePaymentId group that has more than 1 month record:
 *   - Keep the record with the LOWEST (year, month) — the month actually paid for
 *   - Delete all other records from that group
 *   - Credit the player with (numDeleted * monthlyFee) as creditBalance
 *
 * Safe to run multiple times — idempotent.
 */
import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Payment from '@/models/Payment'
import Player from '@/models/Player'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()

    const settings = await Settings.findOne().lean<{ monthlyFee: number } | null>()
    const monthlyFee = settings?.monthlyFee ?? 30

    // ── Step 1: backfill paidAmount on old records that don't have it or have 0 ────────
    // Old records were created before paidAmount was added to the schema.
    // Set paidAmount = total for all such records so future queries are consistent.
    const backfillResult = await Payment.updateMany(
      { 
        $or: [
          { paidAmount: { $exists: false } }, 
          { paidAmount: null }, 
          { paidAmount: 0 }
        ], 
        status: { $in: ['paid', 'partial'] } 
      },
      [{ $set: { paidAmount: '$total' } }]
    )

    // ── Step 2: clean up corrupt multi-month groups ───────────────────────────
    // Find all sourcePaymentIds that have more than 1 record
    const groups = await Payment.aggregate([
      { $match: { sourcePaymentId: { $exists: true, $ne: null } } },
      { $group: { _id: '$sourcePaymentId', count: { $sum: 1 }, docs: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } },
    ])

    const results: Array<{
      sourceId: string; player: string; kept: string; deleted: number; creditAdded: number
    }> = []

    for (const group of groups) {
      // Sort by year asc, month asc — keep the earliest month
      const docs: any[] = group.docs.sort((a: any, b: any) =>
        a.year !== b.year ? a.year - b.year : a.month - b.month
      )
      const keepDoc  = docs[0]
      const deleteDocs = docs.slice(1)

      // Only process groups that have records in different months (real problem case)
      const uniqueMonths = new Set(docs.map((d: any) => `${d.year}-${d.month}`))
      if (uniqueMonths.size <= 1) continue // already fine

      // Delete extra records
      const deleteIds = deleteDocs.map((d: any) => d._id)
      await Payment.deleteMany({ _id: { $in: deleteIds } })

      // Credit the player: each deleted month = 1 month's fee
      const creditToAdd = deleteDocs.length * monthlyFee
      await Player.findByIdAndUpdate(keepDoc.playerId, {
        $inc: { creditBalance: creditToAdd },
      })

      // Get player name for the result log
      const player = await Player.findById(keepDoc.playerId).select('name').lean<{ name: string } | null>()

      results.push({
        sourceId:    group._id,
        player:      player?.name ?? String(keepDoc.playerId),
        kept:        `${keepDoc.year}-${String(keepDoc.month).padStart(2, '0')} (₹${keepDoc.total})`,
        deleted:     deleteDocs.length,
        creditAdded: creditToAdd,
      })
    }

    return NextResponse.json({
      message: results.length > 0
        ? `Fixed ${results.length} transaction group(s) ✅`
        : 'No corrupt records found — data is already clean ✅',
      fixed: results.length,
      details: results,
    })
  } catch (err) {
    console.error('[fix-payments]', err)
    return NextResponse.json({ error: 'Fix failed', detail: String(err) }, { status: 500 })
  }
}
