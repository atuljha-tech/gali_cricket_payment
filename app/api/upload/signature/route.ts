import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { verifyRequestToken } from '@/lib/auth'
import { SUPERADMIN_EMAIL } from '@/lib/adminConfig'

export const dynamic = 'force-dynamic'

// Folders players/admins are allowed to upload into.
// 'gallery' — public, anyone can add a memory photo.
// 'qr'      — superadmin (Rishi) only, payment QR code.
const ALLOWED_FOLDERS = new Set(['gallery', 'qr'])

/**
 * POST /api/upload/signature
 * Issues a short-lived signed payload so the browser can upload an image
 * file straight to Cloudinary, bypassing our serverless function entirely.
 * This avoids Vercel's request body size limit and keeps uploads fast —
 * MongoDB only ever stores the resulting URL + metadata, never image bytes.
 */
export async function POST(req: NextRequest) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: 'Image upload is not configured on the server' }, { status: 500 })
    }

    const body = await req.json().catch(() => null)
    const folder = typeof body?.folder === 'string' ? body.folder : 'gallery'

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 })
    }

    if (folder === 'qr') {
      const admin = verifyRequestToken(req)
      if (!admin || admin.email !== SUPERADMIN_EMAIL) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const timestamp = Math.round(Date.now() / 1000)
    const fullFolder = `goc-cricket/${folder}`

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: fullFolder },
      process.env.CLOUDINARY_API_SECRET as string
    )

    return NextResponse.json({
      signature,
      timestamp,
      folder: fullFolder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    })
  } catch (err) {
    console.error('[upload signature] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
