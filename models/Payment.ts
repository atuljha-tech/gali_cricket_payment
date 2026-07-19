import mongoose, { Schema, Document } from 'mongoose'

/**
 * A PaymentRecord represents an individual payment transaction made by a player.
 * One player can have multiple payment records (e.g. paying ₹100 at once allocates
 * multiple months). Each allocation line is a separate document in the DB but they
 * share a sourcePaymentId to group them.
 *
 * For backward compat, month-level status is still tracked here.
 */
export interface IPayment extends Document {
  playerId:   mongoose.Types.ObjectId
  month:      number   // 1-12 (which month this record is for)
  year:       number
  amount:     number   // amount allocated to THIS month (≤ monthlyFee)
  fine:       number   // always 0 (fine system removed)
  total:      number   // = amount (fine removed)
  status:     'paid' | 'pending' | 'partial'
  receiptNo:  string
  adminId?:   mongoose.Types.ObjectId
  paidAt?:    Date
  // Payment transaction amount (raw amount entered by admin for this transaction)
  paidAmount?: number
  // Link multiple month records created by a single payment
  sourcePaymentId?: string
}

const PaymentSchema = new Schema<IPayment>(
  {
    playerId:        { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    month:           { type: Number, required: true, min: 1, max: 12 },
    year:            { type: Number, required: true },
    amount:          { type: Number, required: true },
    fine:            { type: Number, default: 0 },
    total:           { type: Number, required: true },
    status:          { type: String, enum: ['paid', 'pending', 'partial'], default: 'pending' },
    receiptNo:       { type: String, unique: true, sparse: true },
    adminId:         { type: Schema.Types.ObjectId, ref: 'Admin' },
    paidAt:          { type: Date },
    paidAmount:      { type: Number },
    sourcePaymentId: { type: String },
  },
  { timestamps: true }
)

// Compound unique index: one payment record per player per month/year
PaymentSchema.index({ playerId: 1, month: 1, year: 1 }, { unique: true })
// Fast status + date queries used by dashboard and history
PaymentSchema.index({ month: 1, year: 1 })
PaymentSchema.index({ status: 1 })
PaymentSchema.index({ sourcePaymentId: 1 })

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema)
