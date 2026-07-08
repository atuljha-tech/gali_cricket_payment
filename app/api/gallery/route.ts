import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'

export const dynamic = 'force-dynamic'

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
        .select('imageData thumbnail uploadedAt uploaderName')
        .lean(),
      GalleryPhoto.countDocuments(),
    ])

    const photos = rawPhotos.map((p: any) => ({
      _id:          p._id,
      url:          p.imageData || '',
      thumbnailUrl: p.thumbnail || p.imageData || '',
      uploadedAt:   p.uploadedAt,
      uploaderName: p.uploaderName || 'Anonymous',
    }))

    const res = NextResponse.json({
      photos,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
    res.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    return res
  } catch (err) {
    console.error('GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    
    const body = await req.json().catch(() => null)
    if (!body?.imageData) {
      return NextResponse.json({ error: 'Image data required' }, { status: 400 })
    }

    const { imageData, thumbnail, uploaderName } = body

    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    const photo = await GalleryPhoto.create({
      imageData,
      thumbnail: thumbnail || imageData,
      uploaderName: uploaderName?.trim() || 'Anonymous',
      uploadedAt: new Date(),
    })

    return NextResponse.json({ photo }, { status: 201 })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
