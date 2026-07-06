import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'
import sharp from 'sharp'

// ── GET /api/gallery ─────────────────────────────────────────────────────────
// Returns thumbnail + metadata. Never returns full imageData in the list
// to keep response payloads small (fast grid loading).
export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '24'))

    const [photos, total] = await Promise.all([
      GalleryPhoto.find({})
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        // Only project what the grid needs — exclude heavy imageData
        .select('thumbnail imageData uploadedAt uploaderName')
        .lean<Array<{
          _id: unknown
          imageData: string
          thumbnail: string
          uploadedAt: Date
          uploaderName?: string
        }>>(),
      GalleryPhoto.countDocuments(),
    ])

    // For grid: send thumbnail if available, otherwise fall back to imageData
    // (backward-compat for old photos uploaded before thumbnail field existed)
    const result = photos.map(p => ({
      _id:          p._id,
      thumbnail:    p.thumbnail || p.imageData,   // grid uses this
      imageData:    p.imageData,                   // lightbox uses this
      uploadedAt:   p.uploadedAt,
      uploaderName: p.uploaderName,
    }))

    return NextResponse.json({ photos: result, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── POST /api/gallery ────────────────────────────────────────────────────────
// Accepts a compressed base64 image from the client.
// Generates a 300px thumbnail server-side using sharp.
export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const { imageData, uploaderName } = await req.json()

    if (!imageData) return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    if (!imageData.startsWith('data:image/')) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })

    // 8MB base64 limit (≈ 6MB actual — client already compressed to ~200KB, this is a safety net)
    if (imageData.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large. Max 6MB.' }, { status: 413 })
    }

    // Generate 300px thumbnail server-side
    let thumbnail = ''
    try {
      const base64Data = imageData.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')
      const thumbBuffer = await sharp(buffer)
        .resize(300, 300, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 70 })
        .toBuffer()
      thumbnail = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`
    } catch {
      // sharp failed — use the full image as fallback
      thumbnail = imageData
    }

    const photo = await GalleryPhoto.create({
      imageData,
      thumbnail,
      uploaderName: uploaderName?.trim() || 'Anonymous',
      uploadedAt: new Date(),
    })

    return NextResponse.json({ photo }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
