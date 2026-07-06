import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'
import { uploadToCloudinary } from '@/lib/cloudinary'

// ── GET /api/gallery ─────────────────────────────────────────────────────────
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
        .select('url thumbnailUrl publicId uploadedAt uploaderName')
        .lean<Array<{
          _id: unknown
          url: string
          thumbnailUrl: string
          publicId: string
          uploadedAt: Date
          uploaderName?: string
        }>>(),
      GalleryPhoto.countDocuments(),
    ])

    return NextResponse.json({
      photos,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── POST /api/gallery ────────────────────────────────────────────────────────
// Client sends a compressed base64 image → we upload to Cloudinary → store URL in MongoDB.
export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const { imageData, uploaderName } = await req.json()

    if (!imageData) return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    if (!imageData.startsWith('data:image/')) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })

    // Upload to Cloudinary — returns CDN URLs
    const { url, publicId, thumbnailUrl } = await uploadToCloudinary(imageData)

    const photo = await GalleryPhoto.create({
      url,
      thumbnailUrl,
      publicId,
      uploaderName: uploaderName?.trim() || 'Anonymous',
      uploadedAt:   new Date(),
    })

    return NextResponse.json({ photo }, { status: 201 })
  } catch (err) {
    console.error('Gallery upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
