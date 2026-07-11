import mongoose, { Schema, Document } from 'mongoose'

export interface IGalleryPhoto extends Document {
  imageUrl: string       // Cloudinary secure URL (or a legacy data URL for photos uploaded before the Cloudinary migration)
  thumbnailUrl?: string  // Optional thumbnail URL
  publicId?: string      // Cloudinary public_id — needed to delete the asset from storage
  // Legacy aliases from an earlier fix — kept only so photos saved under those
  // field names still read correctly. New writes never populate these.
  image?: string
  url?: string
  thumbnail?: string
  uploadedAt: Date
  uploaderName: string
}

const GalleryPhotoSchema = new Schema<IGalleryPhoto>(
  {
    imageUrl: { type: String },
    thumbnailUrl: { type: String },
    publicId: { type: String },
    image: { type: String },
    url: { type: String },
    thumbnail: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploaderName: { type: String, default: 'Anonymous', trim: true, maxlength: 80 },
  },
  { timestamps: true }
)

GalleryPhotoSchema.index({ uploadedAt: -1 })

export default mongoose.models.GalleryPhoto ||
  mongoose.model<IGalleryPhoto>('GalleryPhoto', GalleryPhotoSchema)
