import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'
import cloudinary from '@/lib/cloudinary'
import { verifyRequestToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = verifyRequestToken(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await dbConnect()
    const { id } = params

    const photo = await GalleryPhoto.findByIdAndDelete(id)
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    if (photo.publicId) {
      await cloudinary.uploader.destroy(photo.publicId).catch((err) => {
        console.error('[gallery] cloudinary destroy failed:', err)
      })
    }

    return NextResponse.json({ message: 'Photo deleted successfully' })
  } catch (err) {
    console.error('Delete error:', err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
