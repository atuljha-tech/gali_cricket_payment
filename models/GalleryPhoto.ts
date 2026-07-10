import mongoose, { Schema, Document } from 'mongoose'

export interface IGalleryPhoto extends Document {
  imageUrl: string       // URL to the image (can be external or data URL fallback)
  thumbnailUrl?: string  // Optional thumbnail URL
  uploadedAt: Date
  uploaderName: string
}

const GalleryPhotoSchema = new Schema<IGalleryPhoto>(
  {
    imageUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploaderName: { type: String, default: 'Anonymous', trim: true, maxlength: 80 },
  },
  { timestamps: true }
)

GalleryPhotoSchema.index({ uploadedAt: -1 })

export default mongoose.models.GalleryPhoto ||
  mongoose.model<IGalleryPhoto>('GalleryPhoto', GalleryPhotoSchema)
