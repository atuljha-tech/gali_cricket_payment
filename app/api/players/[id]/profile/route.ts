import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import { verifyRequestToken } from '@/lib/auth'
import { SUPERADMIN_EMAIL } from '@/lib/adminConfig'
import { isValid } from '@/lib/playerMeta'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/players/[id]/profile — Rishi (superadmin) only.
 * Sets a player's cricket speciality and captaincy.
 * Only one captain may exist at a time, so setting one clears the rest.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (admin.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Only the superadmin (Rishi) can edit player profiles.' }, { status: 403 })
  }

  try {
    await dbConnect()
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const { role, battingStyle, bowlingArm, bowlingType, jerseyNumber, isCaptain } = body

    // Validate against the allowed option sets
    if (role !== undefined && !isValid.role(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    if (battingStyle !== undefined && !isValid.batting(battingStyle)) return NextResponse.json({ error: 'Invalid batting style' }, { status: 400 })
    if (bowlingArm !== undefined && !isValid.bowlingArm(bowlingArm)) return NextResponse.json({ error: 'Invalid bowling arm' }, { status: 400 })
    if (bowlingType !== undefined && !isValid.bowlingType(bowlingType)) return NextResponse.json({ error: 'Invalid bowling type' }, { status: 400 })

    const setFields: Record<string, unknown> = {}
    if (role !== undefined) setFields.role = role
    if (battingStyle !== undefined) setFields.battingStyle = battingStyle
    if (bowlingArm !== undefined) setFields.bowlingArm = bowlingArm
    if (bowlingType !== undefined) setFields.bowlingType = bowlingType
    if (jerseyNumber !== undefined) {
      const n = Number(jerseyNumber)
      setFields.jerseyNumber = Number.isFinite(n) && n >= 0 ? n : undefined
    }

    // Captain is exclusive — clear everyone else first, then set this one.
    if (typeof isCaptain === 'boolean') {
      if (isCaptain) {
        await Player.updateMany({ _id: { $ne: params.id }, isCaptain: true }, { $set: { isCaptain: false } })
        setFields.isCaptain = true
      } else {
        setFields.isCaptain = false
      }
    }

    const player = await Player.findByIdAndUpdate(
      params.id,
      { $set: setFields },
      { new: true, runValidators: true }
    ).lean()

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    return NextResponse.json({ player })
  } catch (err) {
    console.error('[player profile] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
