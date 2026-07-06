import mongoose, { Schema, Document } from 'mongoose'

export interface IGalleryPhoto extends Document {
  imageData: string   // base64 data URL
  uploadedAt: Date
  uploaderName?: string
}

const GalleryPhotoSchema = new Schema<IGalleryPhoto>(
  {
    imageData: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploaderName: { type: String, default: 'Anonymous' },
  },
  { timestamps: true }
)

export default mongoose.models.GalleryPhoto ||
  mongoose.model<IGalleryPhoto>('GalleryPhoto', GalleryPhotoSchema)
