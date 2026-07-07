import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'
import { SUPERADMIN_EMAIL } from '@/lib/adminConfig'

// Force dynamic — never cache this route on Vercel CDN
// Without this, Vercel treats it as static GET-only and returns 405 on PUT
export const dynamic = 'force-dynamic'

// GET /api/settings — public (players need fee info)
export async function GET() {
  try {
    await dbConnect()
    let settings = await Settings.findOne().lean()
    if (!settings) {
      settings = await Settings.create({ monthlyFee: 20, dailyFine: 2, dueDate: 10 })
    }
    return NextResponse.json({ settings }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT /api/settings — superadmin (Rishi) only for QR/UPI; any admin for fee/fine/dueDate
export async function PUT(req: NextRequest) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const body = await req.json()
    const { monthlyFee, dailyFine, dueDate, qrImage, upiId } = body

    const isSuperAdmin = admin.email === SUPERADMIN_EMAIL

    const setFields: Record<string, unknown> = {}
    if (monthlyFee !== undefined) setFields.monthlyFee = Number(monthlyFee)
    if (dailyFine  !== undefined) setFields.dailyFine  = Number(dailyFine)
    if (dueDate    !== undefined) setFields.dueDate    = Number(dueDate)
    if (isSuperAdmin) {
      if (upiId   !== undefined) setFields.upiId   = upiId
      if (qrImage !== undefined) setFields.qrImage = qrImage
    }

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: setFields },
      { upsert: true, new: true }
    ).lean()

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('Settings update error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
