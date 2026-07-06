/**
 * POST /api/seed
 * Seeds the 4 fixed admins and 24 predefined players.
 * Safe to run multiple times — uses upsert logic, won't duplicate.
 * After first run the app is ready to use.
 */
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/mongodb'
import Admin from '@/models/Admin'
import Player from '@/models/Player'
import Settings from '@/models/Settings'
import { PREDEFINED_ADMINS, ADMIN_PASSWORD, PREDEFINED_PLAYERS } from '@/lib/adminConfig'

export async function POST() {
  try {
    await dbConnect()

    // ── Seed admins ──────────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
    const adminResults: { email: string; status: string }[] = []

    for (const a of PREDEFINED_ADMINS) {
      const existing = await Admin.findOne({ email: a.email })
      if (existing) {
        existing.name = a.name
        existing.password = hashedPassword
        existing.role = a.role
        await existing.save()
        adminResults.push({ email: a.email, status: 'updated' })
      } else {
        await Admin.create({ name: a.name, email: a.email, password: hashedPassword, role: a.role })
        adminResults.push({ email: a.email, status: 'created' })
      }
    }

    // ── Seed players ─────────────────────────────────────────────────────────
    const playerResults: { name: string; status: string }[] = []

    for (const name of PREDEFINED_PLAYERS) {
      const existing = await Player.findOne({ name: name.trim() })
      if (existing) {
        playerResults.push({ name, status: 'already exists' })
      } else {
        await Player.create({
          name: name.trim(),
          phone: '',          // no phone during seed — can be filled later
          joiningDate: new Date('2024-01-01'),
          active: true,
        })
        playerResults.push({ name, status: 'created' })
      }
    }

    // ── Default settings ─────────────────────────────────────────────────────
    const settingsCount = await Settings.countDocuments()
    if (settingsCount === 0) {
      await Settings.create({
        monthlyFee: 20,
        dailyFine: 2,
        dueDate: 10,
        qrImage: '',
        upiId: '',
      })
    }

    return NextResponse.json({
      message: 'Seed complete ✅',
      admins: adminResults,
      players: playerResults,
      totalAdmins: adminResults.length,
      totalPlayers: playerResults.length,
    })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: 'Seed failed', detail: String(err) }, { status: 500 })
  }
}
