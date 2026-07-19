'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import Modal from '@/components/Modal'
import PlayerCard from '@/components/PlayerCard'
import PlayerProfileEditModal from '@/components/PlayerProfileEditModal'
import {
  Search, Plus, CheckCircle2, Clock, IndianRupee,
  Loader2, RotateCcw, ChevronRight, UserPlus, Filter, Users, Trash2, X, Crown
} from 'lucide-react'
import { MONTH_NAMES } from '@/lib/fineCalculator'

interface PlayerRow {
  _id: string; name: string; phone: string; email?: string; joiningDate: string
  role?: string; battingStyle?: string; bowlingArm?: string; bowlingType?: string
  jerseyNumber?: number; isCaptain?: boolean
  creditBalance?: number; dueBalance?: number
  advanceMonths?: number       // full future months covered by credit
  creditRemainder?: number     // leftover after advance months
  paidMonthsCount?: number     // total paid month records for this player
  payment: {
    _id?: string; status: 'paid' | 'pending' | 'partial'
    fine: number; amount: number; total: number
    receiptNo?: string; paidAt?: string
  }
}

// Payment amount modal for flexible allocation
function PaymentModal({
  player, month, year, monthlyFee, onClose, onSuccess, onOptimisticUpdate,
}: {
  player: PlayerRow; month: number; year: number; monthlyFee: number
  onClose: () => void
  onSuccess: () => void
  onOptimisticUpdate: (playerId: string, status: 'paid' | 'partial', credit: number, due: number) => void
}) {
  const [amount, setAmount]   = useState(String(monthlyFee))
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState<any>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!num || num <= 0) { setError('Enter a valid amount'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player._id, month, year, amount: num }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      // Optimistically update this player's row right away
      const s = data.summary
      const newStatus = s.allocations?.[0]?.status === 'paid' ? 'paid' : 'partial'
      onOptimisticUpdate(player._id, newStatus, s.newCredit ?? 0, s.newDue ?? 0)
      setResult(data.summary)
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  if (result) {
    return (
      <Modal title="Payment Recorded" onClose={() => { onSuccess(); onClose() }}>
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-green-300">₹{result.paidAmount} received</p>
            {result.allocations?.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{MONTH_NAMES[a.month]} {a.year}</span>
                <span className={a.status === 'paid' ? 'text-green-400 font-semibold' : 'text-yellow-400'}>
                  {a.status === 'paid' ? `✓ ₹${a.amountApplied} — Paid` : `Partial ₹${a.amountApplied} (₹${a.due} due)`}
                </span>
              </div>
            ))}
            {(result.advanceMonths > 0 || result.creditRemainder > 0) && (
              <div className="border-t border-slate-700 pt-2 space-y-1">
                {result.advanceMonths > 0 && (
                  <p className="text-xs text-blue-400 font-semibold">
                    🗓 {result.advanceMonths} month{result.advanceMonths !== 1 ? 's' : ''} advance credit
                  </p>
                )}
                {result.creditRemainder > 0 && (
                  <p className="text-xs text-blue-300">
                    +₹{result.creditRemainder} credit balance
                  </p>
                )}
              </div>
            )}
            {result.newDue > 0 && (
              <p className="text-xs text-yellow-400 font-semibold border-t border-slate-700 pt-2">
                Due remaining: ₹{result.newDue}
              </p>
            )}
          </div>
          <button onClick={() => { onSuccess(); onClose() }} className="btn-primary w-full text-sm">Done</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Mark Payment — ${player.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 text-xs text-slate-400 space-y-1">
          <p>Monthly fee: <span className="text-white font-semibold">₹{monthlyFee}</span></p>
          {(player.creditBalance ?? 0) > 0 && (
            <p>Existing credit: <span className="text-blue-400 font-semibold">₹{player.creditBalance}</span> (will be used first)</p>
          )}
          {(player.dueBalance ?? 0) > 0 && (
            <p>Outstanding due: <span className="text-red-400 font-semibold">₹{player.dueBalance}</span></p>
          )}
          <p className="text-slate-500">Month: {MONTH_NAMES[month]} {year}</p>
        </div>
        <div className="space-y-1.5">
          <label className="label">Amount Paid (₹)</label>
          <div className="relative">
            <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="number" min="1" step="1" className="input-field pl-8"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder={`e.g. ${monthlyFee}`} autoFocus
            />
          </div>
          <p className="text-[11px] text-slate-500">
            ₹{monthlyFee} = 1 month · ₹{monthlyFee * 2} = 2 months · any amount works
          </p>
        </div>
        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Record Payment
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function PlayersClient({ adminName, adminEmail }: { adminName: string; adminId: string; adminEmail: string }) {
  const isSuperAdmin = adminEmail === 'rishigoc@mail.com'
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [players, setPlayers]   = useState<PlayerRow[]>([])
  const [monthlyFee, setMonthlyFee] = useState(30)
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'partial'>('all')
  const [actionError, setActionError]   = useState<string>('')

  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState({ name: '', phone: '', email: '', joiningDate: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError]     = useState('')

  const [editPlayer, setEditPlayer]  = useState<PlayerRow | null>(null)
  const [editForm, setEditForm]      = useState({ name: '', phone: '', email: '', joiningDate: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError]     = useState('')

  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [cardPlayer, setCardPlayer]       = useState<PlayerRow | null>(null)
  const [profilePlayer, setProfilePlayer] = useState<PlayerRow | null>(null)
  const [paymentPlayer, setPaymentPlayer] = useState<PlayerRow | null>(null)

  // Optimistically update a player row immediately after payment — no waiting for refetch
  function optimisticPaymentUpdate(playerId: string, status: 'paid' | 'partial', credit: number, due: number) {
    setPlayers(prev => prev.map(p =>
      p._id === playerId
        ? {
            ...p,
            creditBalance: credit,
            dueBalance: due,
            advanceMonths: Math.floor(credit / monthlyFee),
            creditRemainder: credit - Math.floor(credit / monthlyFee) * monthlyFee,
            paidMonthsCount: (p.paidMonthsCount ?? 0) + (status === 'paid' ? 1 : 0),
            payment: { ...p.payment, status },
          }
        : p
    ))
  }

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(
        `/api/players?search=${encodeURIComponent(search)}&month=${month}&year=${year}`,
        { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
      )
      const data = await res.json()
      setPlayers(data.players || [])
      if (data.settings?.monthlyFee) setMonthlyFee(data.settings.monthlyFee)
    } finally {
      setLoading(false)
    }
  }, [search, month, year])

  useEffect(() => {
    const t = setTimeout(fetchPlayers, 300)
    return () => clearTimeout(t)
  }, [fetchPlayers])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('action=add')) setShowAdd(true)
  }, [])

  const filtered = players.filter(p => {
    if (filterStatus === 'all')     return true
    if (filterStatus === 'paid')    return p.payment.status === 'paid'
    if (filterStatus === 'partial') return p.payment.status === 'partial'
    return p.payment.status === 'pending'
  })

  async function undoPayment(player: PlayerRow) {
    if (!player.payment._id) return
    // Optimistically update UI immediately
    setPlayers(prev => prev.map(p =>
      p._id === player._id
        ? { ...p, payment: { ...p.payment, _id: undefined, status: 'pending' as const } }
        : p
    ))
    setActionId(player._id); setActionError('')
    try {
      const res  = await fetch(`/api/payments/${player.payment._id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { await fetchPlayers() }
      else {
        // Revert optimistic update on failure
        setPlayers(prev => prev.map(p => p._id === player._id ? player : p))
        setActionError(data.error || `Failed (${res.status})`)
      }
    } catch (err) {
      setPlayers(prev => prev.map(p => p._id === player._id ? player : p))
      setActionError(err instanceof Error ? err.message : 'Network error')
    } finally { setActionId(null) }
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault(); setAddError(''); setAddLoading(true)
    try {
      const res  = await fetch('/api/players', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || 'Failed'); return }
      setShowAdd(false); setAddForm({ name: '', phone: '', email: '', joiningDate: '' })
      await fetchPlayers()
    } finally { setAddLoading(false) }
  }

  async function handleEditPlayer(e: React.FormEvent) {
    e.preventDefault(); if (!editPlayer) return
    setEditError(''); setEditLoading(true)
    try {
      const res  = await fetch(`/api/players/${editPlayer._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error || 'Failed'); return }
      setEditPlayer(null); await fetchPlayers()
    } finally { setEditLoading(false) }
  }

  async function handleDeletePlayer(id: string) {
    setDeleteLoading(true)
    try {
      await fetch(`/api/players/${id}`, { method: 'DELETE' })
      setDeleteId(null); await fetchPlayers()
    } finally { setDeleteLoading(false) }
  }

  const paidCount    = players.filter(p => p.payment.status === 'paid').length
  const partialCount = players.filter(p => p.payment.status === 'partial').length
  const pendingCount = players.filter(p => p.payment.status === 'pending').length

  const filterTabs = [
    { key: 'all',     label: 'All',     count: players.length },
    { key: 'paid',    label: 'Paid',    count: paidCount },
    { key: 'partial', label: 'Partial', count: partialCount },
    { key: 'pending', label: 'Pending', count: pendingCount },
  ] as const

  return (
    <AdminLayout adminName={adminName} adminEmail={adminEmail}>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="section-title">Players</h1>
            <p className="text-sm text-slate-400 mt-0.5">{players.length} registered members</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus size={16} />
            <span className="hidden sm:inline">Add Player</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {actionError && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <span className="text-sm text-red-300 flex-1">{actionError}</span>
            <button onClick={() => setActionError('')}><X size={16} className="text-red-400" /></button>
          </div>
        )}

        {/* Search + Filters */}
        <div className="card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input-field pl-10 text-sm" placeholder="Search by name or phone..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <select className="input-field text-sm w-36" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTH_NAMES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
              <select className="input-field text-sm w-24" value={year} onChange={e => setYear(Number(e.target.value))}>
                {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-slate-500 mr-1" />
            {filterTabs.map(({ key, label, count }) => (
              <button key={key} onClick={() => setFilterStatus(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  filterStatus === key ? 'bg-green-600 text-white shadow-lg shadow-green-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}>
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterStatus === key ? 'bg-white/20' : 'bg-slate-700'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Player Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-700/40">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 bg-slate-700 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-700 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-700/60 rounded w-1/4" />
                  </div>
                  <div className="h-7 bg-slate-700 rounded-lg w-20" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={24} className="text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No players found</p>
            </div>
          ) : (
            <>
              <div className="hidden lg:grid lg:grid-cols-[2fr_130px_120px_120px_160px_80px] gap-4 px-5 py-3 border-b border-slate-700/50 bg-slate-800/40">
                {['Player', 'Phone', 'Months Paid', 'Credit/Due', 'Status', ''].map(h => (
                  <span key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-slate-700/30">
                {filtered.map(player => {
                  const isPaid    = player.payment.status === 'paid'
                  const isPartial = player.payment.status === 'partial'
                  const isActing  = actionId === player._id
                  const credit    = player.creditBalance ?? 0
                  const due       = player.dueBalance    ?? 0

                  const avatarColor = isPaid ? 'from-green-600 to-green-800'
                    : isPartial ? 'from-blue-600 to-blue-800'
                    : 'from-yellow-600 to-amber-800'

                  return (
                    <div key={player._id} className="group hover:bg-slate-700/20 transition-all duration-200">
                      {/* Mobile */}
                      <div className="lg:hidden px-4 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <button onClick={() => setCardPlayer(player)} className="flex items-center gap-3 min-w-0 text-left">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${avatarColor} flex-shrink-0`}>
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate flex items-center gap-1">
                                {player.name}
                                {player.isCaptain && <Crown size={12} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                              </p>
                              <p className="text-xs text-slate-500">{player.phone}</p>
                            </div>
                          </button>
                          {isPaid ? <span className="badge-paid"><CheckCircle2 size={11} />Paid</span>
                            : isPartial ? <span className="badge-pending"><IndianRupee size={11} />Partial</span>
                            : <span className="badge-pending"><Clock size={11} />Pending</span>}
                        </div>
                        {(credit > 0 || due > 0 || (player.paidMonthsCount ?? 0) > 0) && (
                          <div className="flex items-center gap-3 text-xs flex-wrap">
                            {(player.paidMonthsCount ?? 0) > 0 && (
                              <span className="text-green-400 font-semibold">{player.paidMonthsCount} month{(player.paidMonthsCount ?? 0) !== 1 ? 's' : ''} paid</span>
                            )}
                            {(player.advanceMonths ?? 0) > 0 && (
                              <span className="text-blue-400 font-semibold">{player.advanceMonths} mo advance</span>
                            )}
                            {(player.creditRemainder ?? 0) > 0 && (
                              <span className="text-blue-300">+₹{player.creditRemainder}</span>
                            )}
                            {due > 0 && <span className="text-yellow-400">₹{due} due</span>}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2">
                          {isPaid || isPartial ? (
                            <button onClick={() => undoPayment(player)} disabled={isActing}
                              className="text-xs px-2.5 py-1.5 border border-slate-600 text-slate-400 hover:border-red-600 hover:text-red-400 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1">
                              {isActing ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />} Undo
                            </button>
                          ) : (
                            <button onClick={() => setPaymentPlayer(player)} disabled={isActing}
                              className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-1 font-medium disabled:opacity-50">
                              <CheckCircle2 size={11} /> Mark Paid
                            </button>
                          )}
                          <button onClick={() => { setEditPlayer(player); setEditForm({ name: player.name, phone: player.phone, email: player.email || '', joiningDate: player.joiningDate?.slice(0, 10) || '' }) }}
                            className="text-xs px-2.5 py-1.5 border border-slate-600 text-slate-400 hover:border-blue-600 hover:text-blue-400 rounded-lg">Edit</button>
                          <button onClick={() => setDeleteId(player._id)}
                            className="text-xs px-2.5 py-1.5 border border-slate-600 text-slate-400 hover:border-red-600 hover:text-red-400 rounded-lg"><Trash2 size={11} /></button>
                          <Link href={`/player/${player._id}`} className="text-slate-600 hover:text-slate-300"><ChevronRight size={15} /></Link>
                        </div>
                      </div>

                      {/* Desktop */}
                      <div className="hidden lg:grid lg:grid-cols-[2fr_130px_120px_120px_160px_80px] gap-4 px-5 py-3.5 items-center">
                        <button onClick={() => setCardPlayer(player)} className="flex items-center gap-3 min-w-0 text-left group/name">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${avatarColor} flex-shrink-0`}>
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate flex items-center gap-1 group-hover/name:text-green-400">
                              {player.name}
                              {player.isCaptain && <Crown size={12} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{player.email || '—'}</p>
                          </div>
                        </button>
                        <p className="text-sm text-slate-300">{player.phone}</p>
                        <div className="text-xs space-y-0.5">
                          {(player.paidMonthsCount ?? 0) > 0
                            ? <p className="text-green-400 font-semibold">{player.paidMonthsCount} month{(player.paidMonthsCount ?? 0) !== 1 ? 's' : ''} paid</p>
                            : <p className="text-slate-500">—</p>
                          }
                          {isPartial && player.payment.amount > 0 && (
                            <p className="text-yellow-400 text-[11px]">₹{player.payment.amount} partial</p>
                          )}
                        </div>
                        <div className="text-xs space-y-0.5">
                          {(player.advanceMonths ?? 0) > 0 && (
                            <p className="text-blue-400 font-semibold">{player.advanceMonths} mo advance</p>
                          )}
                          {(player.creditRemainder ?? 0) > 0 && (
                            <p className="text-blue-300">+₹{player.creditRemainder} credit</p>
                          )}
                          {(player.dueBalance ?? 0) > 0 && (
                            <p className="text-yellow-400 font-semibold">₹{player.dueBalance} due</p>
                          )}
                          {!(player.advanceMonths ?? 0) && !(player.creditRemainder ?? 0) && !(player.dueBalance ?? 0) && (
                            <p className="text-slate-600">—</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isPaid ? (
                            <>
                              <span className="badge-paid"><CheckCircle2 size={11} />Paid</span>
                              <button onClick={() => undoPayment(player)} disabled={isActing}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all">
                                {isActing ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                              </button>
                            </>
                          ) : isPartial ? (
                            <>
                              <span className="badge-pending"><IndianRupee size={11} />Partial</span>
                              <button onClick={() => setPaymentPlayer(player)} disabled={isActing}
                                className="text-xs px-2 py-1 bg-green-600/20 hover:bg-green-600 border border-green-600/40 text-green-400 hover:text-white rounded-lg transition-all disabled:opacity-50">
                                {isActing ? <Loader2 size={11} className="animate-spin" /> : 'Pay more'}
                              </button>
                            </>
                          ) : (
                            <button onClick={() => setPaymentPlayer(player)} disabled={isActing}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600 border border-green-600/40 hover:border-green-600 text-green-400 hover:text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50">
                              {isActing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                              Mark Paid
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditPlayer(player); setEditForm({ name: player.name, phone: player.phone, email: player.email || '', joiningDate: player.joiningDate?.slice(0, 10) || '' }) }}
                            className="p-1.5 text-slate-500 hover:text-blue-400 rounded-lg hover:bg-blue-900/20 transition-all">✎</button>
                          <button onClick={() => setDeleteId(player._id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-all"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {paymentPlayer && (
        <PaymentModal
          player={paymentPlayer} month={month} year={year} monthlyFee={monthlyFee}
          onClose={() => setPaymentPlayer(null)}
          onOptimisticUpdate={optimisticPaymentUpdate}
          onSuccess={() => { setPaymentPlayer(null); fetchPlayers() }}
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add New Player" onClose={() => { setShowAdd(false); setAddError('') }}>
          <form onSubmit={handleAddPlayer} className="space-y-4">
            <div className="space-y-1.5"><label className="label">Full Name *</label>
              <input className="input-field" placeholder="Rahul Kumar" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><label className="label">Phone Number</label>
              <input className="input-field" placeholder="9876543210 (optional)" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><label className="label">Email (optional)</label>
              <input className="input-field" type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} /></div>
            <div className="space-y-1.5"><label className="label">Joining Date</label>
              <input className="input-field" type="date" value={addForm.joiningDate} onChange={e => setAddForm({ ...addForm, joiningDate: e.target.value })} /></div>
            {addError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{addError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button type="submit" disabled={addLoading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {addLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add Player
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editPlayer && (
        <Modal title="Edit Player" onClose={() => { setEditPlayer(null); setEditError('') }}>
          <form onSubmit={handleEditPlayer} className="space-y-4">
            <div className="space-y-1.5"><label className="label">Full Name *</label>
              <input className="input-field" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><label className="label">Phone Number</label>
              <input className="input-field" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="optional" /></div>
            <div className="space-y-1.5"><label className="label">Email (optional)</label>
              <input className="input-field" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div className="space-y-1.5"><label className="label">Joining Date</label>
              <input className="input-field" type="date" value={editForm.joiningDate} onChange={e => setEditForm({ ...editForm, joiningDate: e.target.value })} /></div>
            {editError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{editError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditPlayer(null)} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button type="submit" disabled={editLoading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {editLoading ? <Loader2 size={15} className="animate-spin" /> : null} Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <Modal title="Remove Player" onClose={() => setDeleteId(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Remove <span className="font-semibold text-white">{players.find(p => p._id === deleteId)?.name}</span>?
              Their payment history will be kept.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button onClick={() => handleDeletePlayer(deleteId)} disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {deleteLoading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Remove
              </button>
            </div>
          </div>
        </Modal>
      )}

      {cardPlayer && (
        <PlayerCard player={cardPlayer} showFees canEdit={isSuperAdmin}
          onClose={() => setCardPlayer(null)}
          onEdit={() => { setProfilePlayer(cardPlayer); setCardPlayer(null) }} />
      )}

      {profilePlayer && (
        <PlayerProfileEditModal player={profilePlayer}
          onClose={() => setProfilePlayer(null)}
          onSaved={() => { setProfilePlayer(null); fetchPlayers() }} />
      )}
    </AdminLayout>
  )
}
