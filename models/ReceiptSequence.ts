import mongoose, { Schema, Document, Types } from 'mongoose'

interface IReceiptSequence extends Document<string> {
  _id: string
  sequence: number
}

// One atomic counter per receipt year. Deleted payment records can therefore
// never cause a receipt number to be reused.
const ReceiptSequenceSchema = new Schema<IReceiptSequence>(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0, min: 0 },
  },
  { versionKey: false }
)

export default mongoose.models.ReceiptSequence ||
  mongoose.model<IReceiptSequence>('ReceiptSequence', ReceiptSequenceSchema)
