import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestToken } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Admin from '@/models/Admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const payload = verifyRequestToken(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await dbConnect()
  const admin = await Admin.findById(payload.id).select('-password')
  if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ admin })
}
