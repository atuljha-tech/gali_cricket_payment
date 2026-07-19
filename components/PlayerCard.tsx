'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import {
  X, Crown, Shield, CircleDot, Pencil, ChevronRight,
  CheckCircle2, Clock, AlertCircle, IndianRupee, Phone, Calendar
} from 'lucide-react'
import { battingLabel, bowlingLabel } from '@/lib/playerMeta'

export interface PlayerCardData {
  _id: string
  name: string
  phone?: string
  email?: string
  role?: string
  battingStyle?: string
  bowlingArm?: string
  bowlingType?: string
  jerseyNumber?: number
  isCaptain?: boolean
  joiningDate?: string
  payment?: {
    status: 'paid' | 'pending' | 'partial'
    total: number
    fine: number
    amount: number
    paidAt?: string
    receiptNo?: string
  }
}

const roleAccent: Record<string, string> = {
  'Batsman':       'from-emerald-600 to-green-800',
  'Bowler':        'from-indigo-600 to-violet-800',
  'All-rounder':   'from-amber-500 to-orange-700',
  'Wicket-keeper': 'from-cyan-600 to-blue-800',
}

export default function PlayerCard({
  player, showFees = false, canEdit = false, onClose, onEdit,
}: {
  player: PlayerCardData
  showFees?: boolean
  canEdit?: boolean
  onClose: () => void
  onEdit?: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const batting = battingLabel(player.battingStyle)
  const bowling = bowlingLabel(player.bowlingArm, player.bowlingType)
  const hasProfile = player.role || batting || bowling
  const accent = roleAccent[player.role || ''] || 'from-slate-600 to-slate-800'
  const isPaid = player.payment?.status === 'paid'
  const isLate = player.payment && !isPaid && player.payment.fine > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md card overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Banner */}
        <div className={`relative px-6 pt-6 pb-5 bg-gradient-to-br ${accent}`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_-20%,rgba(255,255,255,0.25),transparent_60%)]" />
          <button onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-black/20">
            <X size={16} />
          </button>

          <div className="relative z-10 flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-black/25 border border-white/25 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                {player.jerseyNumber != null ? player.jerseyNumber : player.name.charAt(0).toUpperCase()}
              </div>
              {player.isCaptain && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg ring-2 ring-yellow-200" title="Team Captain">
                  <Crown size={14} className="text-yellow-900 fill-yellow-900" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white truncate">{player.name}</h2>
                {player.isCaptain && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-900 bg-yellow-400 px-2 py-0.5 rounded-full">
                    <Crown size={10} className="fill-yellow-900" /> CAPTAIN
                  </span>
                )}
              </div>
              {player.role
                ? <p className="text-white/90 text-sm font-semibold mt-0.5">{player.role}</p>
                : <p className="text-white/60 text-sm mt-0.5">Role not set</p>}
            </div>
          </div>
        </div>

        {/* Speciality tiles */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield size={12} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Batting</span>
              </div>
              <p className={`text-sm font-semibold ${batting ? 'text-white' : 'text-slate-600'}`}>
                {batting || 'Not set'}
              </p>
              {player.battingStyle && <p className="text-[11px] text-slate-500 mt-0.5">{player.battingStyle}</p>}
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CircleDot size={12} className="text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bowling</span>
              </div>
              <p className={`text-sm font-semibold ${bowling ? 'text-white' : 'text-slate-600'}`}>
                {bowling || "Doesn't bowl"}
              </p>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            {player.phone && <span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-500" />{player.phone}</span>}
            {player.joiningDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="text-slate-500" />
                Joined {new Date(player.joiningDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Fees — admin only */}
          {showFees && player.payment && (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IndianRupee size={14} className="text-slate-400" />
                  <span className="text-sm font-semibold text-white">This month</span>
                </div>
                {isPaid
                  ? <span className="badge-paid"><CheckCircle2 size={11} /> Paid</span>
                  : isLate
                  ? <span className="badge-late"><AlertCircle size={11} /> Late</span>
                  : <span className="badge-pending"><Clock size={11} /> Pending</span>}
              </div>
              <div className="flex items-end justify-between mt-3">
                <div>
                  <p className="text-[11px] text-slate-500">{isPaid ? 'Paid amount' : 'Amount due'}</p>
                  <p className={`text-2xl font-black ${isPaid ? 'text-green-400' : isLate ? 'text-red-400' : 'text-yellow-400'}`}>
                    ₹{player.payment.total}
                  </p>
                </div>
                {player.payment.fine > 0 && (
                  <p className="text-xs text-red-400 mb-1">incl. ₹{player.payment.fine} fine</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Link href={`/player/${player._id}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 btn-ghost text-sm">
              Full profile <ChevronRight size={14} />
            </Link>
            {canEdit && (
              <button onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 btn-primary text-sm">
                <Pencil size={14} /> Edit profile
              </button>
            )}
          </div>

          {canEdit && !hasProfile && (
            <p className="text-center text-[11px] text-slate-500">
              This player has no speciality set yet — tap <span className="text-green-400 font-semibold">Edit profile</span> to add it.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
