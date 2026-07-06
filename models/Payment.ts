import mongoose, { Schema, Document } from 'mongoose'

export interface IPayment extends Document {
  playerId: mongoose.Types.ObjectId
  month: number   // 1-12
  year: number
  amount: number
  fine: number
  total: number
  status: 'paid' | 'pending'
  receiptNo: string
  adminId?: mongoose.Types.ObjectId
  paidAt?: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    fine: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ['paid', 'pending'], default: 'pending' },
    receiptNo: { type: String, unique: true, sparse: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
    paidAt: { type: Date },
  },
  { timestamps: true }
)

// Compound unique index: one payment record per player per month/year
PaymentSchema.index({ playerId: 1, month: 1, year: 1 }, { unique: true })
// Fast status + date queries used by dashboard and history
PaymentSchema.index({ month: 1, year: 1 })
PaymentSchema.index({ status: 1 })

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema)
