'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import {
  ArrowLeft, IndianRupee, Plus, Pencil, Trash2, Loader2,
  Wallet, ShoppingBag, MapPin, Utensils, Trophy, Package,
  MoreHorizontal, X, Check, AlertTriangle, TrendingDown,
  Calendar, User
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
type Category = 'equipment' | 'ground' | 'food' | 'travel' | 'award' | 'other'

interface Transaction {
  _id: string
  amount: number
  reason: string
  details: string
  date: string
  adminName: string
  category: Category
}

interface FormState {
  amount: string
  reason: string
  details: string
  date: string
  category: Category
}

// ── Category meta ────────────────────────────────────────────────────────────
const CATEGORIES: Record<Category, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  equipment: { label: 'Equipment',  icon: <Package   size={14} />, color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/25' },
  ground:    { label: 'Ground',     icon: <MapPin    size={14} />, color: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/25' },
  food:      { label: 'Food',       icon: <Utensils  size={14} />, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/25' },
  travel:    { label: 'Travel',     icon: <ArrowLeft size={14} />, color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/25' },
  award:     { label: 'Award',      icon: <Trophy    size={14} />, color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/25' },
  other:     { label: 'Other',      icon: <MoreHorizontal size={14} />, color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/25' },
}

const BLANK: FormState = { amount: '', reason: '', details: '', date: new Date().toISOString().split('T')[0], category: 'other' }

// ── Add / Edit Modal ─────────────────────────────────────────────────────────
function TransactionModal({
  initial, onClose, onSaved,
}: {
  initial?: Transaction
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          amount:   String(initial.amount),
          reason:   initial.reason,
          details:  initial.details,
          date:     initial.date.split('T')[0],
          category: initial.category,
        }
      : BLANK
  )
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.amount || !form.reason || !form.date) { setError('Amount, reason and date are required'); return }
    if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) { setError('Enter a valid amount'); return }
    setLoading(true); setError('')
    try {
      const url    = initial ? `/api/transactions/${initial._id}` : '/api/transactions'
      const method = initial ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      onSaved(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-red-500/15 border border-red-500/25 rounded-lg flex items-center justify-center">
              <TrendingDown size={14} className="text-red-400" />
            </div>
            <h2 className="font-bold text-white text-sm">{initial ? 'Edit Expense' : 'Log Expense'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Amount (₹) *</label>
              <div className="relative">
                <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="number" min="1" placeholder="0"
                  className="bg-slate-900/80 border border-slate-600/60 text-slate-100 placeholder-slate-500 rounded-xl pl-8 pr-4 py-2.5 w-full focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all text-sm"
                  value={form.amount} onChange={e => set('amount', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date *</label>
              <input type="date"
                className="bg-slate-900/80 border border-slate-600/60 text-slate-100 rounded-xl px-4 py-2.5 w-full focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all text-sm"
                value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Title / Reason *</label>
            <input type="text" placeholder="e.g. Cricket bat purchase" maxLength={100}
              className="bg-slate-900/80 border border-slate-600/60 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 w-full focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all text-sm"
              value={form.reason} onChange={e => set('reason', e.target.value)} />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORIES) as Category[]).map(cat => (
                <button key={cat} type="button"
                  onClick={() => set('category', cat)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    form.category === cat
                      ? `${CATEGORIES[cat].bg} ${CATEGORIES[cat].color} ring-1 ring-current/30`
                      : 'bg-slate-900/60 border-slate-700/40 text-slate-500 hover:border-slate-500/60 hover:text-slate-300'
                  }`}>
                  {CATEGORIES[cat].icon}
                  {CATEGORIES[cat].label}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Details <span className="normal-case font-normal">(optional, 3–4 lines)</span></label>
            <textarea rows={3} placeholder="Describe what was purchased / why money was spent..." maxLength={500}
              className="bg-slate-900/80 border border-slate-600/60 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 w-full focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all text-sm resize-none"
              value={form.details} onChange={e => set('details', e.target.value)} />
            <p className="text-[10px] text-slate-600 text-right">{form.details.length}/500</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertTriangle size={13} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5 pt-3 border-t border-slate-700/40 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-xl text-sm font-medium transition-all">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-900/30">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {initial ? 'Save Changes' : 'Log Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Public header (non-admin view) ───────────────────────────────────────────
function PublicFundHeader() {
  return (
    <header className="bg-slate-900/95 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Wallet size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Fund Spending</p>
            <p className="text-[10px] text-slate-500">Gali Online Cricket · Expenses</p>
          </div>
        </div>
      </div>
    </header>
  )
}

// ── Transaction Card ─────────────────────────────────────────────────────────
function TxnCard({
  txn, isAdmin, onEdit, onDelete,
}: {
  txn: Transaction
  isAdmin: boolean
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}) {
  const cat = CATEGORIES[txn.category] ?? CATEGORIES.other
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await onDelete(txn._id)
    setDeleting(false)
    setConfirming(false)
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4 md:p-5 hover:border-slate-600/50 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Category icon */}
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${cat.bg} ${cat.color}`}>
            {cat.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-white">{txn.reason}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.color}`}>
                {cat.icon} {cat.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
              <span className="flex items-center gap-1"><Calendar size={11} />{new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className="flex items-center gap-1"><User size={11} />{txn.adminName}</span>
            </div>
            {txn.details && (
              <p className="text-xs text-slate-400 leading-relaxed">{txn.details}</p>
            )}
          </div>
        </div>
        {/* Amount + actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="text-lg font-black text-red-400">−₹{txn.amount.toLocaleString('en-IN')}</p>
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              {confirming ? (
                <>
                  <button onClick={() => setConfirming(false)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-600/50 text-slate-400 hover:text-white transition-all">
                    Cancel
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 transition-all disabled:opacity-50">
                    {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => onEdit(txn)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-400 hover:text-white transition-all">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => setConfirming(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700/60 hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-all">
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function FundClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading,      setLoading]      = useState(true)
  const [totalSpent,   setTotalSpent]   = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)
  const [page,         setPage]         = useState(1)
  const [isAdmin,      setIsAdmin]      = useState(false)
  const [adminName,    setAdminName]    = useState<string | undefined>()
  const [adminEmail,   setAdminEmail]   = useState<string | undefined>()
  const [showModal,    setShowModal]    = useState(false)
  const [editTxn,      setEditTxn]      = useState<Transaction | undefined>()
  const [activeFilter, setActiveFilter] = useState<Category | 'all'>('all')

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/transactions?page=${p}&limit=20`)
      const data = await res.json()
      setTransactions(p === 1 ? (data.transactions || []) : prev => [...prev, ...(data.transactions || [])])
      setTotalSpent(data.totalSpent || 0)
      setTotalPages(data.pages || 1)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData(1)
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.admin) { setIsAdmin(true); setAdminName(d.admin.name); setAdminEmail(d.admin.email) } })
      .catch(() => {})
  }, [fetchData])

  const deleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Delete failed')
      setTransactions(prev => prev.filter(t => t._id !== id))
      setTotalSpent(prev => {
        const removed = transactions.find(t => t._id === id)
        return removed ? prev - removed.amount : prev
      })
    } catch (e) { console.error(e) }
  }

  const filtered = activeFilter === 'all' ? transactions : transactions.filter(t => t.category === activeFilter)

  // Category breakdown for stats
  const breakdown = (Object.keys(CATEGORIES) as Category[]).map(cat => ({
    cat,
    total: transactions.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0),
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total)

  const Content = (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/80 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(239,68,68,0.08),transparent_70%)]" />
        <div className="absolute inset-0 pitch-bg opacity-20" />
        <div className="relative z-10 px-4 md:px-8 py-12 md:py-16 max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/15 border border-red-500/25 px-3 py-1 rounded-full">
                  <TrendingDown size={11} /> Fund Expenses
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                GOC <span className="text-red-400">Spending</span>
              </h1>
              <p className="text-slate-400 mt-2 text-base max-w-md">
                Transparent record of how the collected fund is being used.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <TrendingDown size={16} className="text-red-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Total Spent</p>
                    <p className="text-xl font-black text-red-400">₹{totalSpent.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/60 border border-slate-700/40 rounded-xl">
                  <ShoppingBag size={16} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Transactions</p>
                    <p className="text-xl font-black text-white">{transactions.length}</p>
                  </div>
                </div>
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => { setEditTxn(undefined); setShowModal(true) }}
                className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-xl shadow-red-900/30 transition-all duration-200 active:scale-95 text-sm self-start md:self-auto">
                <Plus size={18} /> Log Expense
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-12">
        {/* Category breakdown */}
        {breakdown.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 -mt-4 relative z-10">
            {breakdown.map(({ cat, total }) => {
              const meta = CATEGORIES[cat]
              return (
                <div key={cat} className={`flex items-center gap-3 p-3.5 rounded-xl border ${meta.bg} cursor-pointer transition-all hover:scale-[1.02]`}
                  onClick={() => setActiveFilter(activeFilter === cat ? 'all' : cat)}>
                  <div className={`${meta.color}`}>{meta.icon}</div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>
                    <p className="text-sm font-black text-white">₹{total.toLocaleString('en-IN')}</p>
                  </div>
                  {activeFilter === cat && <Check size={12} className={`ml-auto ${meta.color}`} />}
                </div>
              )
            })}
          </div>
        )}

        {/* Filter pills */}
        {transactions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <button onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${activeFilter === 'all' ? 'bg-slate-200 text-slate-900 border-slate-200' : 'border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'}`}>
              All ({transactions.length})
            </button>
            {(Object.keys(CATEGORIES) as Category[]).filter(cat => transactions.some(t => t.category === cat)).map(cat => (
              <button key={cat} onClick={() => setActiveFilter(activeFilter === cat ? 'all' : cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeFilter === cat
                    ? `${CATEGORIES[cat].bg} ${CATEGORIES[cat].color}`
                    : 'border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}>
                {CATEGORIES[cat].icon} {CATEGORIES[cat].label}
              </button>
            ))}
          </div>
        )}

        {/* Transaction list */}
        {loading && transactions.length === 0 ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-20 h-20 bg-slate-800/60 border-2 border-dashed border-slate-700 rounded-3xl flex items-center justify-center mb-5">
              <Wallet size={32} className="text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {activeFilter === 'all' ? 'No expenses logged yet' : `No ${CATEGORIES[activeFilter].label} expenses`}
            </h3>
            <p className="text-slate-500 text-sm max-w-xs">
              {isAdmin && activeFilter === 'all'
                ? 'Start logging fund expenses so everyone can see how the money is being used.'
                : 'Try selecting a different category filter.'}
            </p>
            {isAdmin && activeFilter === 'all' && (
              <button onClick={() => { setEditTxn(undefined); setShowModal(true) }}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all active:scale-95 text-sm">
                <Plus size={16} /> Log First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(txn => (
              <TxnCard key={txn._id} txn={txn} isAdmin={isAdmin}
                onEdit={t => { setEditTxn(t); setShowModal(true) }}
                onDelete={deleteTransaction}
              />
            ))}
            {/* Load more */}
            {page < totalPages && (
              <div className="flex justify-center pt-2">
                <button onClick={() => { const next = page + 1; setPage(next); fetchData(next) }}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  Load more
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <p className="text-center text-xs text-slate-600 mt-6">
            {transactions.length} expense{transactions.length !== 1 ? 's' : ''} · Total ₹{totalSpent.toLocaleString('en-IN')} spent · GOC Fund
          </p>
        )}
      </div>
    </div>
  )

  return (
    <>
      {isAdmin
        ? <AdminLayout adminName={adminName} adminEmail={adminEmail}>{Content}</AdminLayout>
        : (
          <div className="min-h-screen bg-slate-950 pitch-bg text-slate-100">
            <PublicFundHeader />
            {Content}
          </div>
        )
      }
      {showModal && (
        <TransactionModal
          initial={editTxn}
          onClose={() => { setShowModal(false); setEditTxn(undefined) }}
          onSaved={() => fetchData(1)}
        />
      )}
    </>
  )
}
