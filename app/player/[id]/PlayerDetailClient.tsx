'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Phone, Mail, Calendar, Crown, Shield, CircleDot, Pencil } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/fineCalculator'
import { battingLabel, bowlingLabel } from '@/lib/playerMeta'
import PlayerProfileEditModal from '@/components/PlayerProfileEditModal'

interface Payment {
  _id: string; month: number; year: number; amount: number; fine: number; total: number
  status: 'paid' | 'pending'; receiptNo?: string; paidAt?: string; adminId?: { name: string }
}
interface Player {
  _id: string; name: string; phone: string; email?: string; joiningDate: string; active: boolean
  role?: string; battingStyle?: string; bowlingArm?: string; bowlingType?: string; jerseyNumber?: number; isCaptain?: boolean
}

export default function PlayerDetailClient({ playerId, adminName, adminEmail }: { playerId: string; adminName: string; adminEmail?: string }) {
  const isSuperAdmin = adminEmail === 'rishigoc@mail.com'
  const [player, setPlayer] = useState<Player | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const fetchPlayer = useCallback(() => {
    fetch(`/api/players/${playerId}`)
      .then(r => r.json())
      .then(d => { setPlayer(d.player); setPayments(d.payments || []); setLoading(false) })
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

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.total, 0)
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
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg ring-2 ring-yellow-200" title="Team Captain">
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
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${player.active ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'}`}>
                  {player.active ? 'Active' : 'Inactive'}
                </span>
                {player.role && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                    {player.role}
                  </span>
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
                  <Calendar size={13} className="text-slate-500" /> Joined {new Date(player.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {/* Cricket speciality */}
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
                  {bowlingLabel(player.bowlingArm, player.bowlingType) || 'Doesn’t bowl'}
                </p>
              </div>
            </div>
          )}

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-700/40">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{paidMonths}</p>
              <p className="text-xs text-slate-500 mt-0.5">Months Paid</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">₹{totalPaid}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Paid</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-300">{payments.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Records</p>
            </div>
          </div>
        </div>

        {/* History */}
        <div>
          <h2 className="text-sm font-bold text-slate-300 mb-3">Payment History</h2>
          {payments.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 text-sm">No payment records yet</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="divide-y divide-slate-700/30">
                {payments.map((p) => (
                  <div key={p._id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-700/20 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-white">{MONTH_NAMES[p.month]} {p.year}</p>
                      {p.receiptNo && <p className="text-xs text-slate-500 font-mono mt-0.5">{p.receiptNo}</p>}
                      {p.paidAt && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(p.paidAt).toLocaleDateString('en-IN')}{p.adminId && ` · ${p.adminId.name}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1.5">
                      {p.status === 'paid' ? (
                        <span className="badge-paid"><CheckCircle2 size={10} />Paid</span>
                      ) : p.fine > 0 ? (
                        <span className="badge-late"><AlertCircle size={10} />Late</span>
                      ) : (
                        <span className="badge-pending"><Clock size={10} />Pending</span>
                      )}
                      <p className="text-base font-bold text-white">₹{p.total}</p>
                      {p.fine > 0 && <p className="text-xs text-red-400">Fine: ₹{p.fine}</p>}
                      {p.status === 'paid' && p._id && (
                        <Link href={`/receipt/${p._id}`} className="text-xs text-green-400 hover:text-green-300 transition-colors block">
                          Receipt →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
