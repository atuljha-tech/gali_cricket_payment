import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Settings from '@/models/Settings'
import { verifyRequestToken } from '@/lib/auth'
import { SUPERADMIN_EMAIL } from '@/lib/adminConfig'

// GET /api/settings — public (players need fee info)
export async function GET() {
  try {
    await dbConnect()
    let settings = await Settings.findOne().lean()
    if (!settings) {
      settings = await Settings.create({ monthlyFee: 20, dailyFine: 2, dueDate: 10 })
    }
    return NextResponse.json({ settings })
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

    // Only Rishi can update QR / UPI fields
    const isSuperAdmin = admin.email === SUPERADMIN_EMAIL

    // Use $set explicitly so mongoose doesn't try to replace the whole doc
    const setFields: Record<string, unknown> = {}
    if (monthlyFee !== undefined) setFields.monthlyFee = Number(monthlyFee)
    if (dailyFine  !== undefined) setFields.dailyFine  = Number(dailyFine)
    if (dueDate    !== undefined) setFields.dueDate    = Number(dueDate)
    if (isSuperAdmin) {
      if (upiId    !== undefined) setFields.upiId    = upiId
      if (qrImage  !== undefined) setFields.qrImage  = qrImage
    }

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: setFields },
      { upsert: true, new: true, lean: true }
    )

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('Settings update error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
