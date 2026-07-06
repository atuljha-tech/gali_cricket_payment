import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'
import { uploadToCloudinary } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

// ── GET /api/gallery ─────────────────────────────────────────────────────────
// Returns ALL photos — Cloudinary-hosted (url field) AND legacy base64 (imageData field)
export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '24'))

    const [rawPhotos, total] = await Promise.all([
      GalleryPhoto.find({})
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('url thumbnailUrl publicId imageData thumbnail uploadedAt uploaderName')
        .lean<Array<{
          _id: unknown
          url?: string
          thumbnailUrl?: string
          publicId?: string
          imageData?: string
          thumbnail?: string
          uploadedAt: Date
          uploaderName?: string
        }>>(),
      GalleryPhoto.countDocuments(),
    ])

    // Normalise: every photo gets a `url` and `thumbnailUrl`
    // New photos → Cloudinary CDN URLs
    // Old photos → base64 imageData / thumbnail fields (still works)
    const photos = rawPhotos.map(p => ({
      _id:          p._id,
      url:          p.url          || p.imageData  || '',   // full image
      thumbnailUrl: p.thumbnailUrl || p.thumbnail  || p.imageData || '', // grid
      publicId:     p.publicId     || '',
      uploadedAt:   p.uploadedAt,
      uploaderName: p.uploaderName || 'Anonymous',
      isLegacy:     !p.url && !!p.imageData,  // flag for migration
    })).filter(p => p.url !== '')  // skip truly empty records

    return NextResponse.json({
      photos,
      total: photos.length < limit ? (page - 1) * limit + photos.length : total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('Gallery GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── POST /api/gallery ────────────────────────────────────────────────────────
// Uploads to Cloudinary if credentials exist, otherwise stores as base64 fallback
export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const { imageData, uploaderName } = await req.json()

    if (!imageData) return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    if (!imageData.startsWith('data:image/')) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })

    const hasCloudinary = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
    )

    let photoData: Record<string, string>

    if (hasCloudinary) {
      // Upload to Cloudinary CDN
      const { url, publicId, thumbnailUrl } = await uploadToCloudinary(imageData)
      photoData = { url, thumbnailUrl, publicId, imageData: '', thumbnail: '' }
    } else {
      // Fallback: store base64 directly (works without Cloudinary setup)
      photoData = { url: '', thumbnailUrl: '', publicId: '', imageData, thumbnail: imageData }
    }

    const photo = await GalleryPhoto.create({
      ...photoData,
      uploaderName: uploaderName?.trim() || 'Anonymous',
      uploadedAt:   new Date(),
    })

    return NextResponse.json({ photo }, { status: 201 })
  } catch (err) {
    console.error('Gallery upload error:', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
