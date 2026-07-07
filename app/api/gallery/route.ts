import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'
import { uploadToCloudinary } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

// ── GET /api/gallery ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    // First page: 6 photos (instant load), subsequent: 12
    const defaultLimit = page === 1 ? 6 : 12
    const limit = Math.min(24, parseInt(searchParams.get('limit') || String(defaultLimit)))

    const [rawPhotos, total] = await Promise.all([
      GalleryPhoto.find({})
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * (page === 1 ? limit : 12 * (page - 1)))
        .limit(limit)
        // NEVER select imageData in list — can be megabytes of base64
        .select('url thumbnailUrl publicId uploadedAt uploaderName')
        .lean<Array<{
          _id: unknown
          url?: string
          thumbnailUrl?: string
          publicId?: string
          uploadedAt: Date
          uploaderName?: string
        }>>(),
      GalleryPhoto.countDocuments(),
    ])

    const photos = rawPhotos
      .map(p => ({
        _id:          p._id,
        url:          p.url          || '',
        thumbnailUrl: p.thumbnailUrl || p.url || '',
        publicId:     p.publicId     || '',
        uploadedAt:   p.uploadedAt,
        uploaderName: p.uploaderName || 'Anonymous',
      }))
      .filter(p => p.url !== '')

    const res = NextResponse.json({ photos, total, page, pages: Math.ceil(total / limit) })
    // Cache gallery list for 30 seconds on CDN — photos don't change every second
    res.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res
  } catch (err) {
    console.error('Gallery GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── POST /api/gallery ────────────────────────────────────────────────────────
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
      const { url, publicId, thumbnailUrl } = await uploadToCloudinary(imageData)
      photoData = { url, thumbnailUrl, publicId, imageData: '', thumbnail: '' }
    } else {
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
