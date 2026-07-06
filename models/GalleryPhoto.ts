import mongoose, { Schema, Document } from 'mongoose'

export interface IGalleryPhoto extends Document {
  // New Cloudinary fields
  url:          string
  thumbnailUrl: string
  publicId:     string
  // Legacy base64 fields (kept for backward compat)
  imageData?:   string
  thumbnail?:   string
  uploadedAt:   Date
  uploaderName?: string
}

const GalleryPhotoSchema = new Schema<IGalleryPhoto>(
  {
    url:          { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    publicId:     { type: String, default: '' },
    imageData:    { type: String, default: '' },  // legacy
    thumbnail:    { type: String, default: '' },  // legacy
    uploadedAt:   { type: Date, default: Date.now },
    uploaderName: { type: String, default: 'Anonymous' },
  },
  { timestamps: true }
)

GalleryPhotoSchema.index({ uploadedAt: -1 })

export default mongoose.models.GalleryPhoto ||
  mongoose.model<IGalleryPhoto>('GalleryPhoto', GalleryPhotoSchema)
