import mongoose, { Schema, Document } from 'mongoose'

export interface IGalleryPhoto extends Document {
  imageUrl?: string       // URL to the image (new field name)
  url?: string            // URL to the image (old field name for compatibility)
  thumbnailUrl?: string  // Optional thumbnail URL
  uploadedAt: Date
  uploaderName: string
}

const GalleryPhotoSchema = new Schema<IGalleryPhoto>(
  {
    imageUrl: { type: String },
    url: { type: String },
    thumbnailUrl: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploaderName: { type: String, default: 'Anonymous', trim: true, maxlength: 80 },
  },
  { timestamps: true }
)

// Pre-save hook to ensure both imageUrl and url are in sync (for backwards compatibility)
GalleryPhotoSchema.pre('save', function (next) {
  if (this.isModified('imageUrl') && this.imageUrl) {
    this.url = this.imageUrl;
  } else if (this.isModified('url') && this.url) {
    this.imageUrl = this.url;
  }
  next();
});

GalleryPhotoSchema.index({ uploadedAt: -1 })

export default mongoose.models.GalleryPhoto ||
  mongoose.model<IGalleryPhoto>('GalleryPhoto', GalleryPhotoSchema)
