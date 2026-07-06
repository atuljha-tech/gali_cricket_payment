import mongoose, { Schema, Document } from 'mongoose'

export interface IGalleryPhoto extends Document {
  imageData: string    // full quality base64 — used only in lightbox
  thumbnail: string    // ~300px compressed base64 — used in grid
  uploadedAt: Date
  uploaderName?: string
}

const GalleryPhotoSchema = new Schema<IGalleryPhoto>(
  {
    imageData:    { type: String, required: true },
    thumbnail:    { type: String, default: '' },   // filled on upload
    uploadedAt:   { type: Date, default: Date.now },
    uploaderName: { type: String, default: 'Anonymous' },
  },
  { timestamps: true }
)

// Index for fast newest-first pagination
GalleryPhotoSchema.index({ uploadedAt: -1 })

export default mongoose.models.GalleryPhoto ||
  mongoose.model<IGalleryPhoto>('GalleryPhoto', GalleryPhotoSchema)
