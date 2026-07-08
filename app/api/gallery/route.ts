import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'
import { uploadToCloudinary } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
        .select('url thumbnailUrl publicId imageData thumbnail uploadedAt uploaderName')
        .lean(),
      GalleryPhoto.countDocuments(),
    ])

    const photos = rawPhotos.map(p => ({
      _id:          p._id,
      url:          p.url       || p.imageData  || '',
      thumbnailUrl: p.thumbnailUrl || p.thumbnail || p.imageData || '',
      publicId:     p.publicId  || '',
      uploadedAt:   p.uploadedAt,
      uploaderName: p.uploaderName || 'Anonymous',
    })).filter(p => p.url !== '')

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

export async function POST(req: NextRequest) {
  console.log('📸 Gallery upload started')
  try {
    await dbConnect()
    
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({ 
        error: 'Request too large or invalid JSON. Try uploading fewer photos at once.' 
      }, { status: 413 })
    }
    
    const { imageData, uploaderName } = body

    if (!imageData) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    }
    
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    const base64Size = imageData.length * 0.75 / (1024 * 1024)
    console.log(`📊 Image size: ~${base64Size.toFixed(2)}MB`)
    if (base64Size > 10) {
      return NextResponse.json({ 
        error: 'Image too large. Please compress or use a smaller photo.' 
      }, { status: 413 })
    }

    const hasCloudinary = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
    )

    if (!hasCloudinary) {
      console.error('❌ Cloudinary not configured')
      return NextResponse.json({ 
        error: 'Upload service not configured. Contact admin.' 
      }, { status: 500 })
    }

    console.log('☁️ Uploading to Cloudinary...')
    const { url, publicId, thumbnailUrl } = await uploadToCloudinary(imageData)
    
    if (!url || !publicId || !thumbnailUrl) {
      throw new Error('Invalid Cloudinary response')
    }
    console.log('✅ Cloudinary upload successful:', publicId)

    const photo = await GalleryPhoto.create({
      url,
      thumbnailUrl,
      publicId,
      imageData: '',
      thumbnail: '',
      uploaderName: uploaderName?.trim() || 'Anonymous',
      uploadedAt: new Date(),
    })

    console.log('💾 Saved to database:', photo._id)
    return NextResponse.json({ photo }, { status: 201 })
    
  } catch (err) {
    console.error('❌ Gallery upload error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ 
      error: `Upload failed: ${errorMessage}. Please try again.` 
    }, { status: 500 })
  }
}
