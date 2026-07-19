import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Payment from '@/models/Payment'
import Player from '@/models/Player'
import Settings from '@/models/Settings'

/**
 * POST /api/payments/notify
 * Called when a player clicks "I Have Paid".
 * Records a claim — admin still needs to verify manually.
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const { playerId, month, year } = await req.json()

    const [player, settings] = await Promise.all([
      Player.findById(playerId),
      Settings.findOne().lean<{ monthlyFee: number } | null>(),
    ])
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const fee = settings?.monthlyFee ?? 30

    await Payment.findOneAndUpdate(
      { playerId, month, year },
      { $setOnInsert: { playerId, month, year, amount: fee, fine: 0, total: fee, status: 'pending' } },
      { upsert: true }
    )

    return NextResponse.json({ message: 'Admin notified. Please wait for confirmation.' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
