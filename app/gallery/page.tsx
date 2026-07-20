import GalleryClient from './GalleryClient'
import dbConnect from '@/lib/mongodb'
import GalleryPhoto from '@/models/GalleryPhoto'

export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  await dbConnect()
  const limit = 12
  const [rawPhotos, total] = await Promise.all([
    GalleryPhoto.find({})
      .sort({ uploadedAt: -1 })
      .limit(limit)
      .select('imageUrl thumbnailUrl publicId uploadedAt uploaderName image url thumbnail imageData')
      .lean(),
    GalleryPhoto.countDocuments(),
  ])

  // Normalise field names
  const photos = rawPhotos.map((p: any) => {
    const fullUrl = (p.imageUrl || p.image || p.url || p.imageData || '') as string
    let gridUrl = (p.thumbnailUrl || p.thumbnail || '') as string
    
    // Fallbacks if missing
    if (!gridUrl) {
       if (fullUrl.startsWith('http')) gridUrl = fullUrl.replace('/upload/', '/upload/w_300,h_300,c_fill,q_60,f_auto/')
       else gridUrl = fullUrl
    }

    return {
      _id: p._id.toString(),
      url: fullUrl,
      thumbnailUrl: gridUrl,
      publicId: p.publicId || '',
      uploadedAt: p.uploadedAt ? p.uploadedAt.toISOString() : new Date().toISOString(),
      uploaderName: p.uploaderName || 'Anonymous',
    }
  }).filter((p: any) => p.url !== '')

  const initialData = { photos, total, pages: Math.ceil(total / limit) }

  return <GalleryClient initialData={initialData} />
}
