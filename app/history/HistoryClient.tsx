'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import { CheckCircle2, AlertCircle, FileText, IndianRupee, TrendingUp, Clock, Trash2, Loader2 } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/fineCalculator'

interface Payment {
  _id: string
  month: number
  year: number
  amount: number
  fine: number
  total: number
  status: 'paid' | 'pending'
  receiptNo?: string
  paidAt?: string
  playerId: { _id: string; name: string; phone: string }
  adminId?: { name: string }
}

export default function HistoryClient({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  // Delete state
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments?month=${month}&year=${year}&page=${page}&limit=20`)
      const data = await res.json()
      setPayments(data.payments || [])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    } finally {
      setLoading(false)
    }
  }, [month, year, page])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  async function handleDelete() {
    if (!confirmId) return
    setDeleting(true)
    try {
      await fetch(`/api/payments/${confirmId}`, { method: 'DELETE' })
      setPayments(prev => prev.filter(p => p._id !== confirmId))
      setTotal(t => t - 1)
      setConfirmId(null)
    } finally {
      setDeleting(false)
    }
  }

  const collected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.total, 0)
  const paidCount = payments.filter(p => p.status === 'paid').length
  const confirmPayment = payments.find(p => p._id === confirmId)

  return (
    <AdminLayout adminName={adminName} adminEmail={adminEmail}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="section-title">Payment History</h1>
          <p className="text-sm text-slate-400 mt-0.5">{total} records found</p>
        </div>

        {/* Filters + summary */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="bg-slate-900/80 border border-slate-600/60 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-all"
              value={month}
              onChange={(e) => { setMonth(Number(e.target.value)); setPage(1) }}
            >
              {MONTH_NAMES.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              className="bg-slate-900/80 border border-slate-600/60 text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-all"
              value={year}
              onChange={(e) => { setYear(Number(e.target.value)); setPage(1) }}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
                <IndianRupee size={14} className="text-green-400" />
                <span className="text-sm font-bold text-green-400">₹{collected}</span>
                <span className="text-xs text-slate-500">collected</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-700/40 px-3 py-2 rounded-xl">
                <TrendingUp size={13} className="text-slate-400" />
                <span className="text-sm font-semibold text-white">{paidCount}</span>
                <span className="text-xs text-slate-500">paid</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-700/30">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-slate-700 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-700 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-700/60 rounded w-1/4" />
                  </div>
                  <div className="h-6 bg-slate-700 rounded-full w-16" />
                </div>
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center">
              <Clock size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No records for {MONTH_NAMES[month]} {year}</p>
            </div>
          ) : (
            <>
              {/* Desktop header */}
              <div className="hidden md:grid md:grid-cols-[2fr_140px_80px_80px_90px_130px_80px] gap-4 px-5 py-3 border-b border-slate-700/40 bg-slate-800/40">
                {['Player', 'Period', 'Fee', 'Fine', 'Total', 'Status', ''].map((h) => (
                  <span key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
                ))}
              </div>

              <div className="divide-y divide-slate-700/30">
                {payments.map((p) => (
                  <div key={p._id} className="group hover:bg-slate-700/20 transition-colors">

                    {/* Mobile */}
                    <div className="md:hidden px-4 py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{p.playerId?.name || '—'}</p>
                          <p className="text-xs text-slate-500">{p.playerId?.phone} · {MONTH_NAMES[p.month]} {p.year}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-white">₹{p.total}</p>
                          {p.status === 'paid'
                            ? <span className="badge-paid"><CheckCircle2 size={10} />Paid</span>
                            : <span className="badge-pending"><Clock size={10} />Pending</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {p.receiptNo ? (
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-slate-500 font-mono">{p.receiptNo}</p>
                            <Link href={`/receipt/${p._id}`} className="text-xs text-green-400 hover:text-green-300 transition-colors">
                              Receipt →
                            </Link>
                          </div>
                        ) : <span />}
                        <button
                          onClick={() => setConfirmId(p._id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-slate-600/60 text-slate-500 hover:border-red-500/60 hover:text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </div>

                    {/* Desktop */}
                    <div className="hidden md:grid md:grid-cols-[2fr_140px_80px_80px_90px_130px_80px] gap-4 px-5 py-3.5 items-center">
                      <div>
                        <p className="text-sm font-semibold text-white">{p.playerId?.name || '—'}</p>
                        <p className="text-xs text-slate-500">{p.playerId?.phone}</p>
                      </div>
                      <p className="text-sm text-slate-300">{MONTH_NAMES[p.month]} {p.year}</p>
                      <p className="text-sm text-slate-300">₹{p.amount}</p>
                      <p className={`text-sm font-medium ${p.fine > 0 ? 'text-red-400' : 'text-slate-500'}`}>₹{p.fine}</p>
                      <p className="text-sm font-bold text-white">₹{p.total}</p>
                      <div>
                        {p.status === 'paid'
                          ? <span className="badge-paid"><CheckCircle2 size={10} />Paid</span>
                          : p.fine > 0
                          ? <span className="badge-late"><AlertCircle size={10} />Late</span>
                          : <span className="badge-pending"><Clock size={10} />Pending</span>}
                      </div>
                      {/* Receipt + Delete */}
                      <div className="flex items-center gap-2">
                        {p.receiptNo ? (
                          <Link href={`/receipt/${p._id}`}
                            className="text-green-400 hover:text-green-300 transition-colors" title={p.receiptNo}>
                            <FileText size={15} />
                          </Link>
                        ) : <span className="w-4" />}
                        <button
                          onClick={() => setConfirmId(p._id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 rounded transition-all"
                          title="Delete record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-5 py-2.5 text-sm border border-slate-600/50 rounded-xl disabled:opacity-40 hover:border-slate-500 text-slate-300 transition-all">
              Previous
            </button>
            <span className="text-sm text-slate-500 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl">
              {page} / {pages}
            </span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-5 py-2.5 text-sm border border-slate-600/50 rounded-xl disabled:opacity-40 hover:border-slate-500 text-slate-300 transition-all">
              Next
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmId && confirmPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Delete Payment Record?</h3>
                <p className="text-sm text-slate-400 mt-1">
                  This will permanently remove the payment record for{' '}
                  <span className="text-white font-semibold">{confirmPayment.playerId?.name}</span>
                  {' '}({MONTH_NAMES[confirmPayment.month]} {confirmPayment.year} · ₹{confirmPayment.total}).
                  This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)}
                className="flex-1 py-2.5 border border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-xl text-sm font-medium transition-all">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all">
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
