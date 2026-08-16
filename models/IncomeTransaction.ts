import mongoose, { Schema, Document } from 'mongoose'

export interface IIncomeTransaction extends Document {
  amount: number
  reason: string
  details: string
  date: Date
  adminId: mongoose.Types.ObjectId
  adminName: string
  category: 'donation' | 'sponsorship' | 'subscription' | 'tournament' | 'merchandise' | 'other'
  source: string
}

const IncomeTransactionSchema = new Schema<IIncomeTransaction>(
  {
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, maxlength: 100 },
    details: { type: String, default: '', trim: true, maxlength: 500 },
    date: { type: Date, required: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    adminName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['donation', 'sponsorship', 'subscription', 'tournament', 'merchandise', 'other'],
      default: 'other',
    },
    source: { type: String, default: '', trim: true, maxlength: 100 },
  },
  { timestamps: true }
)

IncomeTransactionSchema.index({ date: -1 })

export default mongoose.models.IncomeTransaction ||
  mongoose.model<IIncomeTransaction>('IncomeTransaction', IncomeTransactionSchema)
