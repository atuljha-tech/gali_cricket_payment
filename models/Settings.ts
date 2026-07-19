import mongoose, { Schema, Document } from 'mongoose'

export interface ISettings extends Document {
  monthlyFee: number
  dueDate: number   // day of month (last day of month for due date display only)
  qrImage: string   // Cloudinary secure URL
  upiId: string
}

const SettingsSchema = new Schema<ISettings>(
  {
    monthlyFee: { type: Number, default: 30 },
    dueDate:    { type: Number, default: 31 },  // last day of month
    qrImage:    { type: String, default: '' },
    upiId:      { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema)
