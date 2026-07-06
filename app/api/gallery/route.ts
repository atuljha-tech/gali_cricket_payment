import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'

// GET /api/gallery — public, returns photos newest first
export async function GET(req: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const [photos, total] = await Promise.all([
      GalleryPhoto.find({})
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<Array<{ _id: unknown; imageData: string; uploadedAt: Date; uploaderName?: string }>>(),
      GalleryPhoto.countDocuments(),
    ])

    return NextResponse.json({ photos, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/gallery — public upload (anyone can add)
export async function POST(req: NextRequest) {
  try {
    await dbConnect()
    const body = await req.json()
    const { imageData, uploaderName } = body

    if (!imageData) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    }

    // Validate it's a base64 image (basic check)
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    // 5MB limit check (base64 ≈ 1.37× original size)
    if (imageData.length > 7 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large. Max 5MB.' }, { status: 413 })
    }

    const photo = await GalleryPhoto.create({
      imageData,
      uploaderName: uploaderName?.trim() || 'Anonymous',
      uploadedAt: new Date(),
    })

    return NextResponse.json({ photo }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
