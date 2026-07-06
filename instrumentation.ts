/**
 * Next.js Instrumentation Hook
 * Runs once on server startup — seeds the 4 admins and 23 players
 * automatically so no manual /api/seed call is ever needed.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: dbConnect } = await import('./lib/mongodb')
    const { default: bcrypt }    = await import('bcryptjs')
    const { default: Admin }     = await import('./models/Admin')
    const { default: Player }    = await import('./models/Player')
    const { default: Settings }  = await import('./models/Settings')
    const { PREDEFINED_ADMINS, ADMIN_PASSWORD, PREDEFINED_PLAYERS } = await import('./lib/adminConfig')

    try {
      await dbConnect()

      // ── Seed admins ──────────────────────────────────────────────────
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
      for (const a of PREDEFINED_ADMINS) {
        const existing = await Admin.findOne({ email: a.email })
        if (existing) {
          existing.name     = a.name
          existing.password = hashedPassword
          existing.role     = a.role
          await existing.save()
        } else {
          await Admin.create({
            name:     a.name,
            email:    a.email,
            password: hashedPassword,
            role:     a.role,
          })
        }
      }

      // ── Seed players (skip existing ones) ───────────────────────────
      for (const name of PREDEFINED_PLAYERS) {
        const exists = await Player.findOne({ name: name.trim() })
        if (!exists) {
          await Player.create({
            name:        name.trim(),
            phone:       '',
            joiningDate: new Date('2024-01-01'),
            active:      true,
          })
        }
      }

      // ── Default settings ─────────────────────────────────────────────
      const count = await Settings.countDocuments()
      if (count === 0) {
        await Settings.create({
          monthlyFee: 20,
          dailyFine:  2,
          dueDate:    10,
          qrImage:    '',
          upiId:      '',
        })
      }

      console.log('✅ GOC auto-seed complete')
    } catch (err) {
      console.error('❌ GOC auto-seed error:', err)
    }
  }
}
