'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { ArrowLeft, CheckCircle2, Clock, Phone, Mail, Calendar, Crown, Shield, CircleDot, Pencil, IndianRupee, ChevronDown, ChevronUp } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/fineCalculator'
import { battingLabel, bowlingLabel } from '@/lib/playerMeta'
import PlayerProfileEditModal from '@/components/PlayerProfileEditModal'

interface MonthRecord {
  month: number; year: number; status: string
  amountApplied: number; receiptNo?: string
}
interface TransactionEntry {
  sourcePaymentId: string; paidAt?: string; paidAmount: number; adminName: string
  months: MonthRecord[]
}
interface PaymentRecord {
  _id: string; month: number; year: number; amount: number; fine: number; total: number
  status: 'paid' | 'pending' | 'partial'; receiptNo?: string; paidAt?: string; adminId?: { name: string }
}
interface Player {
  _id: string; name: string; phone: string; email?: string; joiningDate: string; active: boolean
  role?: string; battingStyle?: string; bowlingArm?: string; bowlingType?: string; jerseyNumber?: number; isCaptain?: boolean
}

function formatDate(s?: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TxnCard({ txn }: { txn: TransactionEntry }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
            <IndianRupee size={14} className="text-green-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">₹{txn.paidAmount} paid</p>
            <p className="text-[11px] text-slate-500">{formatDate(txn.paidAt)} · by {txn.adminName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{txn.months.length} month{txn.months.length !== 1 ? 's' : ''}</span>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-slate-700/40 pt-3">
          {txn.months.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">{MONTH_NAMES[m.month]} {m.year}</span>
              <div className="flex items-center gap-3">
                {m.status === 'paid'
                  ? <span className="text-green-400 font-semibold">✓ ₹{m.amountApplied} — Paid</span>
                  : <span className="text-yellow-400">₹{m.amountApplied} — Partial (₹{30 - m.amountApplied} due)</span>}
                {m.receiptNo && <span className="text-slate-600 font-mono text-[10px]">{m.receiptNo}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PlayerDetailClient({ playerId, adminName, adminEmail }: { playerId: string; adminName: string; adminEmail?: string }) {
  const isSuperAdmin = adminEmail === 'rishigoc@mail.com'
  const [player, setPlayer]   = useState<Player | null>(null)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [txnHistory, setTxnHistory] = useState<TransactionEntry[]>([])
  const [creditBalance, setCreditBalance] = useState(0)
  const [dueBalance, setDueBalance]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const fetchPlayer = useCallback(() => {
    fetch(`/api/players/${playerId}`)
      .then(r => r.json())
      .then(d => {
        setPlayer(d.player)
        setPayments(d.payments || [])
        setTxnHistory(d.transactionHistory || [])
        setCreditBalance(d.creditBalance ?? 0)
        setDueBalance(d.dueBalance ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [playerId])

  useEffect(() => { fetchPlayer() }, [fetchPlayer])

  if (loading) return (
    <AdminLayout adminName={adminName}>
      <div className="space-y-4 animate-pulse max-w-2xl">
        <div className="h-8 bg-slate-700 rounded-xl w-1/4" />
        <div className="card p-6 space-y-4">
          <div className="flex gap-4"><div className="w-16 h-16 bg-slate-700 rounded-2xl" /><div className="flex-1 space-y-3"><div className="h-5 bg-slate-700 rounded w-1/2" /><div className="h-3 bg-slate-700/60 rounded w-1/3" /></div></div>
        </div>
      </div>
    </AdminLayout>
  )

  if (!player) return (
    <AdminLayout adminName={adminName}>
      <div className="card p-12 text-center max-w-2xl">
        <p className="text-slate-500">Player not found</p>
        <Link href="/players" className="btn-primary mt-4 inline-block text-sm">← Back to Players</Link>
      </div>
    </AdminLayout>
  )

  const totalPaid  = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.total, 0)
  const paidMonths = payments.filter(p => p.status === 'paid').length

  return (
    <AdminLayout adminName={adminName}>
      <div className="space-y-5 max-w-2xl">
        <Link href="/players" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={15} /> Back to Players
        </Link>

        {/* Profile */}
        <div className="card p-6 relative">
          {isSuperAdmin && (
            <button onClick={() => setEditOpen(true)}
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 btn-ghost text-xs z-10">
              <Pencil size={13} /> Edit
            </button>
          )}
          <div className="flex items-start gap-5">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-green-900/30">
                {player.jerseyNumber != null ? player.jerseyNumber : player.name.charAt(0).toUpperCase()}
              </div>
              {player.isCaptain && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg ring-2 ring-yellow-200">
                  <Crown size={14} className="text-yellow-900 fill-yellow-900" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white">{player.name}</h1>
                {player.isCaptain && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-900 bg-yellow-400 px-2 py-0.5 rounded-full">
                    <Crown size={10} className="fill-yellow-900" /> CAPTAIN
                  </span>
                )}
                {player.role && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">{player.role}</span>
                )}
              </div>
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Phone size={13} className="text-slate-500" /> {player.phone || '—'}
                </div>
                {player.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Mail size={13} className="text-slate-500" /> {player.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar size={13} className="text-slate-500" />
                  Joined {new Date(player.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {(player.battingStyle || player.bowlingArm || player.role) && (
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Batting</span>
                </div>
                <p className={`text-sm font-semibold ${player.battingStyle ? 'text-white' : 'text-slate-600'}`}>
                  {battingLabel(player.battingStyle) || 'Not set'}
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <CircleDot size={12} className="text-indigo-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bowling</span>
                </div>
                <p className={`text-sm font-semibold ${player.bowlingArm ? 'text-white' : 'text-slate-600'}`}>
                  {bowlingLabel(player.bowlingArm, player.bowlingType) || "Doesn't bowl"}
                </p>
              </div>
            </div>
          )}

          {/* Mini stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-700/40">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{paidMonths}</p>
              <p className="text-xs text-slate-500 mt-0.5">Months Paid</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">₹{totalPaid}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Paid</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${creditBalance > 0 ? 'text-blue-400' : 'text-slate-600'}`}>₹{creditBalance}</p>
              <p className="text-xs text-slate-500 mt-0.5">Credit</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${dueBalance > 0 ? 'text-yellow-400' : 'text-slate-600'}`}>₹{dueBalance}</p>
              <p className="text-xs text-slate-500 mt-0.5">Due</p>
            </div>
          </div>
        </div>

        {/* Transaction History (admin view — shows full allocation breakdown) */}
        <div>
          <h2 className="text-sm font-bold text-slate-300 mb-3">Payment History</h2>
          {txnHistory.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 text-sm">No payment records yet</div>
          ) : (
            <div className="space-y-3">
              {txnHistory.map(txn => (
                <TxnCard key={txn.sourcePaymentId} txn={txn} />
              ))}
            </div>
          )}
        </div>

        {/* Credit/Due summary if any */}
        {(creditBalance > 0 || dueBalance > 0) && (
          <div className="card p-4 flex items-center gap-4">
            {creditBalance > 0 && (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5">
                <IndianRupee size={14} className="text-blue-400" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Credit Balance</p>
                  <p className="text-lg font-black text-blue-400">₹{creditBalance}</p>
                </div>
              </div>
            )}
            {dueBalance > 0 && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5">
                <Clock size={14} className="text-yellow-400" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Due Balance</p>
                  <p className="text-lg font-black text-yellow-400">₹{dueBalance}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isSuperAdmin && editOpen && player && (
        <PlayerProfileEditModal
          player={player}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); fetchPlayer() }}
        />
      )}
    </AdminLayout>
  )
}
