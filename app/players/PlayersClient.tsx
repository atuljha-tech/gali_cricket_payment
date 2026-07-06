'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import Modal from '@/components/Modal'
import {
  Search, Plus, CheckCircle2, Clock, AlertCircle,
  Loader2, RotateCcw, ChevronRight, UserPlus, Filter, Users, Trash2
} from 'lucide-react'
import { MONTH_NAMES } from '@/lib/fineCalculator'

interface PlayerRow {
  _id: string
  name: string
  phone: string
  email?: string
  joiningDate: string
  payment: {
    _id?: string
    status: 'paid' | 'pending'
    fine: number
    amount: number
    total: number
    receiptNo?: string
    paidAt?: string
  }
}

export default function PlayersClient({ adminName, adminEmail }: { adminName: string; adminId: string; adminEmail: string }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'late'>('all')

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', joiningDate: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  const [editPlayer, setEditPlayer] = useState<PlayerRow | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', joiningDate: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/players?search=${encodeURIComponent(search)}&month=${month}&year=${year}`)
      const data = await res.json()
      setPlayers(data.players || [])
    } finally {
      setLoading(false)
    }
  }, [search, month, year])

  async function handleDeletePlayer(id: string) {
    setDeleteLoading(true)
    try {
      await fetch(`/api/players/${id}`, { method: 'DELETE' })
      setDeleteId(null)
      await fetchPlayers()
    } finally {
      setDeleteLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(fetchPlayers, 300)
    return () => clearTimeout(t)
  }, [fetchPlayers])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('action=add')) {
      setShowAdd(true)
    }
  }, [])

  const filtered = players.filter(p => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'paid') return p.payment.status === 'paid'
    if (filterStatus === 'late') return p.payment.status === 'pending' && p.payment.fine > 0
    return p.payment.status === 'pending'
  })

  async function markPaid(player: PlayerRow) {
    setActionId(player._id)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player._id, month, year }),
      })
      if (res.ok) fetchPlayers()
    } finally {
      setActionId(null)
    }
  }

  async function undoPayment(player: PlayerRow) {
    if (!player.payment._id) return
    setActionId(player._id)
    try {
      const res = await fetch(`/api/payments/${player.payment._id}`, { method: 'DELETE' })
      if (res.ok) await fetchPlayers()
    } finally {
      setActionId(null)
    }
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || 'Failed'); return }
      setShowAdd(false)
      setAddForm({ name: '', phone: '', email: '', joiningDate: '' })
      fetchPlayers()
    } finally {
      setAddLoading(false)
    }
  }

  async function handleEditPlayer(e: React.FormEvent) {
    e.preventDefault()
    if (!editPlayer) return
    setEditError('')
    setEditLoading(true)
    try {
      const res = await fetch(`/api/players/${editPlayer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error || 'Failed'); return }
      setEditPlayer(null)
      fetchPlayers()
    } finally {
      setEditLoading(false)
    }
  }

  const paidCount = players.filter(p => p.payment.status === 'paid').length
  const pendingCount = players.filter(p => p.payment.status === 'pending').length
  const lateCount = players.filter(p => p.payment.status === 'pending' && p.payment.fine > 0).length

  const filterTabs = [
    { key: 'all',     label: 'All',     count: players.length },
    { key: 'paid',    label: 'Paid',    count: paidCount },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'late',    label: 'Late',    count: lateCount },
  ] as const

  return (
    <AdminLayout adminName={adminName} adminEmail={adminEmail}>
      <div className="space-y-5">
        {/* Page Header */}
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

        {/* Search + Filters */}
        <div className="card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="input-field pl-10 text-sm"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="input-field text-sm w-36"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                className="input-field text-sm w-24"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-slate-500 mr-1" />
            {filterTabs.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  filterStatus === key
                    ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  filterStatus === key ? 'bg-white/20' : 'bg-slate-700'
                }`}>
                  {count}
                </span>
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
              <div className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-slate-500" />
              </div>
              <p className="text-slate-400 font-medium">No players found</p>
              <p className="text-slate-600 text-sm mt-1">Try a different search or filter</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary mt-5 text-sm mx-auto flex items-center gap-2">
                <Plus size={15} /> Add First Player
              </button>
            </div>
          ) : (
            <>
              {/* Desktop header */}
              <div className="hidden lg:grid lg:grid-cols-[2fr_130px_70px_70px_90px_160px_80px] gap-4 px-5 py-3 border-b border-slate-700/50 bg-slate-800/40">
                {['Player', 'Phone', 'Fee', 'Fine', 'Total', 'Status', ''].map((h) => (
                  <span key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
                ))}
              </div>

              <div className="divide-y divide-slate-700/30">
                {filtered.map((player) => {
                  const isPaid = player.payment.status === 'paid'
                  const isLate = !isPaid && player.payment.fine > 0
                  const isActing = actionId === player._id

                  const avatarColor = isPaid
                    ? 'from-green-600 to-green-800'
                    : isLate
                    ? 'from-red-600 to-red-800'
                    : 'from-yellow-600 to-amber-800'

                  return (
                    <div key={player._id} className="group hover:bg-slate-700/20 transition-all duration-200">
                      {/* Mobile */}
                      <div className="lg:hidden px-4 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${avatarColor} flex-shrink-0`}>
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{player.name}</p>
                              <p className="text-xs text-slate-500">{player.phone}</p>
                            </div>
                          </div>
                          {isPaid ? (
                            <span className="badge-paid"><CheckCircle2 size={11} />Paid</span>
                          ) : isLate ? (
                            <span className="badge-late"><AlertCircle size={11} />Late</span>
                          ) : (
                            <span className="badge-pending"><Clock size={11} />Pending</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Fee: <span className="text-slate-300">₹{player.payment.amount}</span></span>
                            {player.payment.fine > 0 && <span className="text-red-400">+₹{player.payment.fine} fine</span>}
                            <span className="font-semibold text-white">₹{player.payment.total}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isPaid ? (
                              <button onClick={() => undoPayment(player)} disabled={isActing}
                                className="text-xs px-2.5 py-1.5 border border-slate-600 text-slate-400 hover:border-red-600 hover:text-red-400 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-1">
                                {isActing ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />} Undo
                              </button>
                            ) : (
                              <button onClick={() => markPaid(player)} disabled={isActing}
                                className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-1 font-medium">
                                {isActing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Mark Paid
                              </button>
                            )}
                            <button onClick={() => { setEditPlayer(player); setEditForm({ name: player.name, phone: player.phone, email: player.email || '', joiningDate: player.joiningDate?.slice(0, 10) || '' }) }}
                              className="text-xs px-2.5 py-1.5 border border-slate-600 text-slate-400 hover:border-blue-600 hover:text-blue-400 rounded-lg transition-all">
                              Edit
                            </button>
                            <button onClick={() => setDeleteId(player._id)}
                              className="text-xs px-2.5 py-1.5 border border-slate-600 text-slate-400 hover:border-red-600 hover:text-red-400 rounded-lg transition-all">
                              <Trash2 size={11} />
                            </button>
                            <Link href={`/player/${player._id}`} className="text-slate-600 hover:text-slate-300">
                              <ChevronRight size={15} />
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Desktop */}
                      <div className="hidden lg:grid lg:grid-cols-[2fr_130px_70px_70px_90px_160px_80px] gap-4 px-5 py-3.5 items-center">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${avatarColor} flex-shrink-0`}>
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{player.name}</p>
                            <p className="text-xs text-slate-500 truncate">{player.email || '—'}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-300">{player.phone}</p>
                        <p className="text-sm text-slate-300">₹{player.payment.amount}</p>
                        <p className={`text-sm font-medium ${player.payment.fine > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          ₹{player.payment.fine}
                        </p>
                        <p className="text-sm font-bold text-white">₹{player.payment.total}</p>
                        <div className="flex items-center gap-2">
                          {isPaid ? (
                            <>
                              <span className="badge-paid"><CheckCircle2 size={11} />Paid</span>
                              <button onClick={() => undoPayment(player)} disabled={isActing}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all" title="Undo">
                                {isActing ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                              </button>
                            </>
                          ) : (
                            <button onClick={() => markPaid(player)} disabled={isActing}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600 border border-green-600/40 hover:border-green-600 text-green-400 hover:text-white text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-50">
                              {isActing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                              Mark Paid
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditPlayer(player); setEditForm({ name: player.name, phone: player.phone, email: player.email || '', joiningDate: player.joiningDate?.slice(0, 10) || '' }) }}
                            className="p-1.5 text-slate-500 hover:text-blue-400 rounded-lg hover:bg-blue-900/20 transition-all" title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => setDeleteId(player._id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-all" title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add New Player" onClose={() => { setShowAdd(false); setAddError('') }}>
          <form onSubmit={handleAddPlayer} className="space-y-4">
            <div className="space-y-1.5">
              <label className="label">Full Name *</label>
              <input className="input-field" placeholder="Rahul Kumar" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <label className="label">Phone Number</label>
              <input className="input-field" placeholder="9876543210 (optional)" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="label">Email (optional)</label>
              <input className="input-field" type="email" placeholder="rahul@example.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="label">Joining Date</label>
              <input className="input-field" type="date" value={addForm.joiningDate} onChange={(e) => setAddForm({ ...addForm, joiningDate: e.target.value })} />
            </div>
            {addError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{addError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button type="submit" disabled={addLoading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {addLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                Add Player
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editPlayer && (
        <Modal title="Edit Player" onClose={() => { setEditPlayer(null); setEditError('') }}>
          <form onSubmit={handleEditPlayer} className="space-y-4">
            <div className="space-y-1.5">
              <label className="label">Full Name *</label>
              <input className="input-field" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <label className="label">Phone Number</label>
              <input className="input-field" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="optional" />
            </div>
            <div className="space-y-1.5">
              <label className="label">Email (optional)</label>
              <input className="input-field" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="label">Joining Date</label>
              <input className="input-field" type="date" value={editForm.joiningDate} onChange={(e) => setEditForm({ ...editForm, joiningDate: e.target.value })} />
            </div>
            {editError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{editError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditPlayer(null)} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button type="submit" disabled={editLoading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {editLoading ? <Loader2 size={15} className="animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal title="Remove Player" onClose={() => setDeleteId(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-white">
                {players.find(p => p._id === deleteId)?.name}
              </span>{' '}
              from the active list? Their payment history will be kept.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button
                onClick={() => handleDeletePlayer(deleteId)}
                disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              >
                {deleteLoading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Remove Player
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}


