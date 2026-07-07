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
    const page  = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 12

    const [rawPhotos, total] = await Promise.all([
      GalleryPhoto.find({})
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        // Select BOTH cloudinary fields AND legacy base64 fields
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

    const photos = rawPhotos.map(p => ({
      _id:          p._id,
      // Cloudinary URL if available, otherwise fall back to base64
      url:          p.url       || p.imageData  || '',
      thumbnailUrl: p.thumbnailUrl || p.thumbnail || p.imageData || '',
      publicId:     p.publicId  || '',
      uploadedAt:   p.uploadedAt,
      uploaderName: p.uploaderName || 'Anonymous',
    })).filter(p => p.url !== '') // only skip truly empty records

    const res = NextResponse.json({
      photos,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
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
