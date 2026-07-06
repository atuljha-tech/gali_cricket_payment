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
    const update: Record<string, unknown> = { monthlyFee, dailyFine, dueDate }
    if (isSuperAdmin) {
      if (qrImage !== undefined) update.qrImage = qrImage
      if (upiId  !== undefined) update.upiId   = upiId
    }

    const settings = await Settings.findOneAndUpdate(
      {},
      update,
      { upsert: true, new: true }
    )

    return NextResponse.json({ settings })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
