import mongoose, { Schema, Document } from 'mongoose'

export interface ITransaction extends Document {
  amount:    number
  reason:    string          // short title
  details:   string          // 2-4 lines description
  date:      Date
  adminId:   mongoose.Types.ObjectId
  adminName: string          // denormalised for fast display
  category:  'equipment' | 'ground' | 'food' | 'travel' | 'award' | 'other'
}

const TransactionSchema = new Schema<ITransaction>(
  {
    amount:    { type: Number, required: true, min: 0 },
    reason:    { type: String, required: true, trim: true, maxlength: 100 },
    details:   { type: String, default: '', trim: true, maxlength: 500 },
    date:      { type: Date, required: true },
    adminId:   { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    adminName: { type: String, required: true, trim: true },
    category:  {
      type: String,
      enum: ['equipment', 'ground', 'food', 'travel', 'award', 'other'],
      default: 'other',
    },
  },
  { timestamps: true }
)

TransactionSchema.index({ date: -1 })

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema)
