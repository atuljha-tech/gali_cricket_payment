/**
 * POST /api/gallery/migrate
 * One-time migration: finds all photos with imageData (base64) but no url,
 * uploads them to Cloudinary, and updates the DB record.
 * Safe to run multiple times — skips already-migrated photos.
 */
import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'
import { uploadToCloudinary } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

export async function POST() {
  const hasCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
  )

  if (!hasCloudinary) {
    return NextResponse.json({ error: 'Cloudinary env vars not configured' }, { status: 400 })
  }

  try {
    await dbConnect()

    // Find photos that have base64 imageData but no Cloudinary url yet
    const legacyPhotos = await GalleryPhoto.find({
      imageData: { $exists: true, $ne: '' },
      url:       { $in: [null, ''] },
    }).lean<Array<{ _id: unknown; imageData: string }>>()

    if (legacyPhotos.length === 0) {
      return NextResponse.json({ message: 'Nothing to migrate — all photos already on Cloudinary', migrated: 0 })
    }

    let migrated = 0
    let failed = 0

    for (const photo of legacyPhotos) {
      try {
        const { url, publicId, thumbnailUrl } = await uploadToCloudinary(photo.imageData)
        await GalleryPhoto.findByIdAndUpdate(photo._id, {
          url, thumbnailUrl, publicId,
          imageData: '',  // clear the large base64 to save DB space
          thumbnail: '',
        })
        migrated++
      } catch (err) {
        console.error(`Failed to migrate photo ${photo._id}:`, err)
        failed++
      }
    }

    return NextResponse.json({
      message: `Migration complete`,
      total:    legacyPhotos.length,
      migrated,
      failed,
    })
  } catch (err) {
    console.error('Migration error:', err)
    return NextResponse.json({ error: 'Migration failed', detail: String(err) }, { status: 500 })
  }
}
