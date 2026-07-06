import mongoose, { Schema, Document } from 'mongoose'

export interface IGalleryPhoto extends Document {
  url:          string   // full Cloudinary URL
  thumbnailUrl: string   // 400px Cloudinary URL
  publicId:     string   // Cloudinary public_id (needed for deletion)
  uploadedAt:   Date
  uploaderName?: string
}

const GalleryPhotoSchema = new Schema<IGalleryPhoto>(
  {
    url:          { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    publicId:     { type: String, default: '' },
    uploadedAt:   { type: Date, default: Date.now },
    uploaderName: { type: String, default: 'Anonymous' },
  },
  { timestamps: true }
)

GalleryPhotoSchema.index({ uploadedAt: -1 })

export default mongoose.models.GalleryPhoto ||
  mongoose.model<IGalleryPhoto>('GalleryPhoto', GalleryPhotoSchema)
