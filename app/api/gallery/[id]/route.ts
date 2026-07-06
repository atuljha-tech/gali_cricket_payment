import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'
import { deleteFromCloudinary } from '@/lib/cloudinary'

// DELETE /api/gallery/[id] — admin only
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()
    const photo = await GalleryPhoto.findByIdAndDelete(params.id)
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

    // Also delete from Cloudinary so storage stays clean
    if (photo.publicId) {
      await deleteFromCloudinary(photo.publicId).catch(console.error)
    }

    return NextResponse.json({ message: 'Photo deleted' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
