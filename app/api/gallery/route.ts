import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Shrink a base64 data-URL to a tiny thumbnail using Sharp (server-side only)
async function makeThumb(dataUrl: string): Promise<string> {
  try {
    const sharp = (await import('sharp')).default
    const base64 = dataUrl.split(',')[1]
    if (!base64) return dataUrl
    const buf = Buffer.from(base64, 'base64')
    const thumb = await sharp(buf)
      .resize(300, 300, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 60, progressive: true })
      .toBuffer()
    return `data:image/jpeg;base64,${thumb.toString('base64')}`
  } catch {
    return dataUrl // fallback: return original if sharp fails
  }
}

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

// ── GET /api/gallery ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = 12 // smaller pages = faster first load

    const [rawPhotos, total] = await Promise.all([
      GalleryPhoto.find({})
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        // Select everything we might need — we'll normalise below
        .select('imageUrl thumbnailUrl publicId uploadedAt uploaderName image url thumbnail imageData')
        .lean<Array<Record<string, unknown>>>(),
      GalleryPhoto.countDocuments(),
    ])

    // Normalise field names across all migration states
    const normalised = rawPhotos.map(p => ({
      _id:          p._id,
      fullUrl:      (p.imageUrl || p.image || p.url || p.imageData || '') as string,
      thumbStored:  (p.thumbnailUrl || p.thumbnail || '') as string,
      publicId:     (p.publicId || '') as string,
      uploadedAt:   p.uploadedAt as Date,
      uploaderName: (p.uploaderName || 'Anonymous') as string,
    })).filter(p => p.fullUrl !== '')

    // Build grid response — use CDN URL as thumbnail if available,
    // otherwise generate a tiny Sharp thumbnail from the base64 so the
    // browser never has to download a 32 MB payload just to render a grid.
    const thumbPromises = normalised.map(async p => {
      const isCloudinary = p.fullUrl.startsWith('http')
      const isBase64     = p.fullUrl.startsWith('data:')

      let gridUrl: string
      if (isCloudinary) {
        // Cloudinary on-the-fly thumbnail transformation
        gridUrl = p.thumbStored ||
          p.fullUrl.replace('/upload/', '/upload/w_300,h_300,c_fill,q_60,f_auto/')
      } else if (isBase64) {
        // Legacy photo — generate a small thumbnail server-side
        gridUrl = p.thumbStored && p.thumbStored.length < p.fullUrl.length
          ? p.thumbStored
          : await makeThumb(p.fullUrl)
      } else {
        gridUrl = p.fullUrl
      }

      return {
        _id:          p._id,
        url:          p.fullUrl,     // full image — only loaded in lightbox
        thumbnailUrl: gridUrl,       // small thumbnail — used in grid
        publicId:     p.publicId,
        uploadedAt:   p.uploadedAt,
        uploaderName: p.uploaderName,
      }
    })

    const photos = await Promise.all(thumbPromises)

    // Async: persist thumbnails back to DB so next request is instant
    // (fire-and-forget, don't await — don't delay the response)
    photos.forEach(async (photo, i) => {
      const orig = normalised[i]
      const isBase64 = orig.fullUrl.startsWith('data:')
      const noThumb  = !orig.thumbStored || orig.thumbStored === orig.fullUrl
      if (isBase64 && noThumb && photo.thumbnailUrl !== orig.fullUrl) {
        GalleryPhoto.findByIdAndUpdate(orig._id, {
          thumbnailUrl: photo.thumbnailUrl,
        }).exec().catch(() => {})
      }
    })

    const res = jsonResponse({ photos, total, page, pages: Math.ceil(total / limit) })
    // Short cache — grid loads fast, new photos appear within 30s
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

// ── POST /api/gallery ─────────────────────────────────────────────────────────
// Receives base64 encoded image, generates thumbnail
export async function POST(req: NextRequest) {
  try {
    await dbConnect()

    const body = await req.json().catch(() => null)
    if (!body) return jsonResponse({ error: 'Invalid request body' }, 400)

    const { image, uploaderName } = body
    const name = typeof uploaderName === 'string' ? uploaderName.trim() : ''

    if (typeof image !== 'string' || !image || !image.startsWith('data:image/')) {
      return jsonResponse({ error: 'Valid base64 image required' }, 400)
    }

    // Generate thumbnail using existing makeThumb function
    const thumbnailUrl = await makeThumb(image)

    const photo = await GalleryPhoto.create({
      image, // save base64 as 'image' field (legacy but compatible)
      imageUrl: image, // also save to imageUrl for consistency
      thumbnailUrl: thumbnailUrl,
      uploaderName: name || 'Anonymous',
      uploadedAt: new Date(),
    })

    return jsonResponse({ photo }, 201)
  } catch (err) {
    console.error('[gallery] POST error:', err)
    return jsonResponse({ error: 'Upload failed' }, 500)
  }
}
