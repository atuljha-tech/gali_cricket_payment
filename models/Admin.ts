import mongoose, { Schema, Document } from 'mongoose'

export interface IAdmin extends Document {
  name: string
  email: string
  password: string
  role: 'admin' | 'superadmin'
}

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  },
  { timestamps: true }
)

export default mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema)
