import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    const { id } = params
    
    const photo = await GalleryPhoto.findByIdAndDelete(id)
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }
    
    return NextResponse.json({ message: 'Photo deleted successfully' })
  } catch (err) {
    console.error('Delete error:', err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
