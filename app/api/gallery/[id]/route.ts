import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'

// DELETE /api/gallery/[id] — anyone can delete (public gallery)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()
    await GalleryPhoto.findByIdAndDelete(params.id)
    return NextResponse.json({ message: 'Photo deleted' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
