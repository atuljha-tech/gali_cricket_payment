import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_IMAGE_SIZE = 2_500_000
const MAX_THUMB_SIZE = 700_000

function withCors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

function jsonResponse(payload: unknown, status = 200) {
  const res = NextResponse.json(payload, { status })
  return withCors(res)
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 12

    const [rawPhotos, total] = await Promise.all([
      GalleryPhoto.find({})
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('imageData thumbnail uploadedAt uploaderName')
        .lean(),
      GalleryPhoto.countDocuments(),
    ])

    const photos = rawPhotos.map((p: any) => ({
      _id: p._id,
      url: p.imageData || '',
      thumbnailUrl: p.thumbnail || p.imageData || '',
      uploadedAt: p.uploadedAt,
      uploaderName: p.uploaderName || 'Anonymous',
    }))

    const res = jsonResponse({
      photos,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
    res.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res
  } catch (err) {
    console.error('[gallery] GET error:', err)
    return jsonResponse({ error: 'Server error' }, 500)
  }
}

export async function OPTIONS() {
  return jsonResponse({}, 200)
}

export async function POST(req: NextRequest) {
  console.log('[gallery] upload request received')

  try {
    await dbConnect()

    const contentLength = req.headers.get('content-length')
    console.log('[gallery] upload content-length:', contentLength)

    const body = await req.json().catch((err) => {
      console.error('[gallery] invalid json body:', err)
      return null
    })

    if (!body?.imageData) {
      console.error('[gallery] missing imageData in request body')
      return jsonResponse({ error: 'Image data required' }, 400)
    }

    const { imageData, thumbnail, uploaderName } = body
    const normalizedName = typeof uploaderName === 'string' ? uploaderName.trim() : ''

    if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
      console.error('[gallery] invalid image format received')
      return jsonResponse({ error: 'Invalid image format' }, 400)
    }

    const imageSize = imageData.length
    const thumbnailSize = typeof thumbnail === 'string' ? thumbnail.length : 0
    console.log('[gallery] upload payload sizes:', { imageSize, thumbnailSize, uploaderName: normalizedName || 'Anonymous' })

    if (imageSize > MAX_IMAGE_SIZE || thumbnailSize > MAX_THUMB_SIZE) {
      console.error('[gallery] payload too large for upload:', { imageSize, thumbnailSize })
      return jsonResponse({ error: 'Image is too large for upload. Please choose a smaller photo.' }, 413)
    }

    const photo = await GalleryPhoto.create({
      imageData,
      thumbnail: thumbnail || imageData,
      uploaderName: normalizedName || 'Anonymous',
      uploadedAt: new Date(),
    })

    console.log('[gallery] upload saved:', { id: photo._id?.toString?.() || 'unknown' })
    return jsonResponse({ photo }, 201)
  } catch (err) {
    console.error('[gallery] upload failed:', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    const friendlyMessage = message.includes('16MB') || message.includes('Document')
      ? 'Image is too large for storage. Please try a smaller photo.'
      : 'Upload failed'
    return jsonResponse({ error: friendlyMessage, details: message }, 500)
  }
}
