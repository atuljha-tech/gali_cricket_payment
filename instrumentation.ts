/**
 * Next.js Instrumentation Hook — runs once on server startup.
 * Seeds only if data is missing. Non-blocking so it doesn't slow cold starts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Run in background — don't await, never block the server boot
    setImmediate(async () => {
      try {
        const { default: dbConnect } = await import('./lib/mongodb')
        await dbConnect()

        const { default: Admin }   = await import('./models/Admin')
        const { default: Player }  = await import('./models/Player')
        const { default: Settings } = await import('./models/Settings')

        // Check counts first — single fast query each, skip all work if already seeded
        const [adminCount, playerCount, settingsCount] = await Promise.all([
          Admin.countDocuments(),
          Player.countDocuments(),
          Settings.countDocuments(),
        ])

        // Ensure exactly one captain exists — default to Bitan. Runs every boot
        // (cheap single query) so existing databases get a captain too.
        const hasCaptain = await Player.exists({ isCaptain: true })
        if (!hasCaptain) {
          await Player.updateOne({ name: 'Bitan' }, { $set: { isCaptain: true } })
        }

        if (adminCount >= 5 && playerCount >= 23 && settingsCount >= 1) {
          return // Already seeded — nothing to do
        }

        // Only import heavy deps if seeding is actually needed
        const { default: bcrypt } = await import('bcryptjs')
        const { PREDEFINED_ADMINS, ADMIN_PASSWORD, PREDEFINED_PLAYERS } = await import('./lib/adminConfig')

        if (adminCount < 5) {
          const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
          for (const a of PREDEFINED_ADMINS) {
            await Admin.findOneAndUpdate(
              { email: a.email },
              { name: a.name, email: a.email, password: hashedPassword, role: a.role },
              { upsert: true }
            )
          }
        }

        if (playerCount < 23) {
          const existing = await Player.distinct('name')
          const existingSet = new Set(existing)
          const toCreate = PREDEFINED_PLAYERS
            .filter(name => !existingSet.has(name.trim()))
            .map(name => ({ name: name.trim(), phone: '', joiningDate: new Date('2024-01-01'), active: true }))
          if (toCreate.length) await Player.insertMany(toCreate, { ordered: false })
        }

        if (settingsCount === 0) {
          await Settings.create({ monthlyFee: 30, dailyFine: 2, dueDate: 28, qrImage: '', upiId: '' })
        }

        console.log('✅ GOC seed complete')
      } catch (err) {
        console.error('❌ GOC seed error:', err)
      }
    })
  }
}
