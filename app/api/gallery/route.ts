import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  console.log('[gallery] GET request received')
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 24 // More photos per page for better UX

    const [rawPhotos, total] = await Promise.all([
      GalleryPhoto.find({})
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('imageUrl thumbnailUrl uploadedAt uploaderName')
        .lean(),
      GalleryPhoto.countDocuments(),
    ])

    console.log('[gallery] found photos:', { count: rawPhotos.length, total })

    const photos = rawPhotos.map((p: any) => ({
      _id: p._id,
      url: p.imageUrl || '',
      thumbnailUrl: p.thumbnailUrl || p.imageUrl || '',
      uploadedAt: p.uploadedAt,
      uploaderName: p.uploaderName || 'Anonymous',
    }))

    const res = jsonResponse({
      photos,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
    res.headers.set('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
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

    const body = await req.json().catch((err) => {
      console.error('[gallery] invalid json body:', err)
      return null
    })

    if (!body) {
      console.error('[gallery] missing body in request')
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const { imageUrl, thumbnailUrl, uploaderName } = body
    const normalizedName = typeof uploaderName === 'string' ? uploaderName.trim() : ''

    // Accept both data URLs and regular URLs
    if (typeof imageUrl !== 'string' || !imageUrl) {
      console.error('[gallery] missing or invalid imageUrl')
      return jsonResponse({ error: 'Image URL required' }, 400)
    }

    // Validate URL format (data URL or https/http)
    const isDataUrl = imageUrl.startsWith('data:')
    const isHttpUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
    
    if (!isDataUrl && !isHttpUrl) {
      console.error('[gallery] invalid image URL format:', { isDataUrl, isHttpUrl })
      return jsonResponse({ error: 'Invalid image URL format' }, 400)
    }

    console.log('[gallery] upload payload:', { 
      imageUrlLength: imageUrl.length,
      thumbnailUrlLength: thumbnailUrl?.length || 0,
      uploaderName: normalizedName || 'Anonymous'
    })

    const photo = await GalleryPhoto.create({
      imageUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
      uploaderName: normalizedName || 'Anonymous',
      uploadedAt: new Date(),
    })

    console.log('[gallery] upload saved:', { id: photo._id?.toString?.() || 'unknown' })
    return jsonResponse({ photo }, 201)
  } catch (err) {
    console.error('[gallery] upload failed:', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return jsonResponse({ error: 'Upload failed', details: message }, 500)
  }
}
