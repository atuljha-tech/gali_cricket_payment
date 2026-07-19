import mongoose, { Schema, Document } from 'mongoose'

export interface IPlayer extends Document {
  name: string
  phone?: string
  email?: string
  joiningDate: Date
  active: boolean
  // ── Cricket profile (superadmin-editable) ──
  role?: string          // Batsman | Bowler | All-rounder | Wicket-keeper
  battingStyle?: string  // RHB | LHB
  bowlingArm?: string    // Right-arm | Left-arm
  bowlingType?: string   // Pace | Medium | Spin
  jerseyNumber?: number
  isCaptain: boolean
  // ── Payment tracking ──
  creditBalance: number
  dueBalance: number
}

const PlayerSchema = new Schema<IPlayer>(
  {
    name:        { type: String, required: true, trim: true },
    phone:       { type: String, trim: true, default: '' },
    email:       { type: String, trim: true, lowercase: true },
    joiningDate: { type: Date, required: true, default: Date.now },
    active:      { type: Boolean, default: true },
    // ── Cricket profile ──
    role:        { type: String, enum: ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper', ''], default: '' },
    battingStyle:{ type: String, enum: ['RHB', 'LHB', ''], default: '' },
    bowlingArm:  { type: String, enum: ['Right-arm', 'Left-arm', ''], default: '' },
    bowlingType: { type: String, enum: ['Pace', 'Medium', 'Spin', ''], default: '' },
    jerseyNumber:{ type: Number, min: 0, max: 999 },
    isCaptain:   { type: Boolean, default: false },
    // ── Payment tracking ──
    creditBalance: { type: Number, default: 0 },
    dueBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// At most one captain — a partial unique index is the safety net; the API also
// clears any existing captain before setting a new one.
PlayerSchema.index({ isCaptain: 1 }, { unique: true, partialFilterExpression: { isCaptain: true } })

// Indexes for fast lookups
PlayerSchema.index({ active: 1, name: 1 })
PlayerSchema.index({ name: 'text' })

export default mongoose.models.Player || mongoose.model<IPlayer>('Player', PlayerSchema)
