import mongoose, { Schema, Document } from 'mongoose'

export interface IGalleryPhoto extends Document {
  image?: string
  imageUrl?: string
  url?: string
  thumbnail?: string
  thumbnailUrl?: string
  uploadedAt: Date
  uploaderName: string
}

const GalleryPhotoSchema = new Schema<IGalleryPhoto>(
  {
    image: { type: String },
    imageUrl: { type: String },
    url: { type: String },
    thumbnail: { type: String },
    thumbnailUrl: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploaderName: { type: String, default: 'Anonymous', trim: true, maxlength: 80 },
  },
  { timestamps: true }
)

// Pre-save hook to ensure all image and thumbnail fields are in sync
GalleryPhotoSchema.pre('save', function (next) {
  const primaryImage = this.image || this.imageUrl || this.url
  const primaryThumbnail = this.thumbnail || this.thumbnailUrl

  if (primaryImage) {
    this.image = primaryImage
    this.imageUrl = primaryImage
    this.url = primaryImage
  }

  if (primaryThumbnail) {
    this.thumbnail = primaryThumbnail
    this.thumbnailUrl = primaryThumbnail
  } else if (primaryImage) {
    this.thumbnail = primaryImage
    this.thumbnailUrl = primaryImage
  }

  next()
})

GalleryPhotoSchema.index({ uploadedAt: -1 })

export default mongoose.models.GalleryPhoto ||
  mongoose.model<IGalleryPhoto>('GalleryPhoto', GalleryPhotoSchema)
