import mongoose, { Schema, Document } from 'mongoose'

export interface IPlayer extends Document {
  name: string
  phone?: string
  email?: string
  joiningDate: Date
  active: boolean
}

const PlayerSchema = new Schema<IPlayer>(
  {
    name:        { type: String, required: true, trim: true },
    phone:       { type: String, trim: true, default: '' },
    email:       { type: String, trim: true, lowercase: true },
    joiningDate: { type: Date, required: true, default: Date.now },
    active:      { type: Boolean, default: true },
  },
  { timestamps: true }
)

// Indexes for fast lookups
PlayerSchema.index({ active: 1, name: 1 })
PlayerSchema.index({ name: 'text' })

export default mongoose.models.Player || mongoose.model<IPlayer>('Player', PlayerSchema)
