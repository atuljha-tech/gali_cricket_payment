
import mongoose, { Schema, Document } from 'mongoose'

export interface IPaymentAllocation extends Document {
  paymentId: mongoose.Types.ObjectId
  type: 'month' | 'credit' | 'due' | 'partial'
  month?: number
  year?: number
  amount: number
  description?: string
}

const PaymentAllocationSchema = new Schema<IPaymentAllocation>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    type: { type: String, enum: ['month', 'credit', 'due', 'partial'], required: true },
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number },
    amount: { type: Number, required: true },
    description: { type: String }
  },
  { timestamps: true }
)

PaymentAllocationSchema.index({ paymentId: 1 })

export default mongoose.models.PaymentAllocation || mongoose.model<IPaymentAllocation>('PaymentAllocation', PaymentAllocationSchema)
