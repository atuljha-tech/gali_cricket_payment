import mongoose, { Schema, Document } from 'mongoose'

export interface IGalleryPhoto extends Document {
  imageData: string
  thumbnail: string
  uploadedAt: Date
  uploaderName: string
}

const GalleryPhotoSchema = new Schema<IGalleryPhoto>(
  {
    imageData:    { type: String, required: true },
    thumbnail:    { type: String, required: true },
    uploadedAt:   { type: Date, default: Date.now },
    uploaderName: { type: String, default: 'Anonymous' },
  },
  { timestamps: true }
)

GalleryPhotoSchema.index({ uploadedAt: -1 })

export default mongoose.models.GalleryPhoto ||
  mongoose.model<IGalleryPhoto>('GalleryPhoto', GalleryPhotoSchema)
