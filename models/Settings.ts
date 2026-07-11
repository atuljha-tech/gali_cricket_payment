import mongoose, { Schema, Document } from 'mongoose'

export interface ISettings extends Document {
  monthlyFee: number
  dailyFine: number
  dueDate: number   // day of month, e.g. 10 means 10th of every month
  qrImage: string   // Cloudinary secure URL (or a legacy base64 string from before the Cloudinary migration)
  upiId: string
}

const SettingsSchema = new Schema<ISettings>(
  {
    monthlyFee: { type: Number, default: 20 },
    dailyFine: { type: Number, default: 2 },
    dueDate: { type: Number, default: 10 },
    qrImage: { type: String, default: '' },
    upiId: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema)
