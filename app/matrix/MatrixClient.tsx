'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import {
  Search, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle,
  Loader2, X, RotateCcw, FileText, Grid3x3, Users, TrendingUp,
  CalendarDays, Sparkles, Wallet, Crown
} from 'lucide-react'
import MatrixSkeleton from './MatrixSkeleton'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface Cell {
  _id?: string
  status: 'paid' | 'pending' | 'none' | 'na'
  amount: number
  fine: number
  total: number
  receiptNo?: string
  paidAt?: string
}
interface Row {
  _id: string
  name: string
  phone: string
  isCaptain?: boolean
  cells: Cell[]
  paidMonths: number
  paidTotal: number
}
interface Summary {
  collected: number
  outstanding: number
  fullyPaid: number
  totalPaidCells: number
  playerCount: number
}
interface MatrixData {
  year: number
  players: Row[]
  monthTotals: number[]
  grandTotal: number
  applicableMonths: number
  summary: Summary
  settings: { monthlyFee: number; dailyFine: number; dueDate: number }
  currentMonth: number
  currentYear: number
}

// ── Cell detail / action modal ───────────────────────────────────────────
function CellModal({
  row, monthIndex, cell, year, onClose, onMarkPaid, onUndo, working,
}: {
  row: Row
  monthIndex: number
  cell: Cell
  year: number
  onClose: () => void
  onMarkPaid: () => void
  onUndo: () => void
  working: boolean
}) {
  const isPaid = cell.status === 'paid'
  const isLate = cell.status === 'pending' && cell.fine > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className={`px-6 py-4 flex items-center justify-between ${isPaid ? 'bg-gradient-to-r from-green-900/60 to-slate-800' : isLate ? 'bg-gradient-to-r from-red-900/40 to-slate-800' : 'bg-gradient-to-r from-yellow-900/30 to-slate-800'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-gradient-to-br ${isPaid ? 'from-green-600 to-green-800' : isLate ? 'from-red-600 to-red-800' : 'from-yellow-600 to-amber-800'}`}>
              {row.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white truncate">{row.name}</p>
              <p className="text-xs text-slate-400">{MONTHS_LONG[monthIndex]} {year}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-center">
            {isPaid
              ? <span className="badge-paid text-sm px-4 py-1.5"><CheckCircle2 size={13} /> Paid</span>
              : isLate
              ? <span className="badge-late text-sm px-4 py-1.5"><AlertCircle size={13} /> Late — fine accruing</span>
              : <span className="badge-pending text-sm px-4 py-1.5"><Clock size={13} /> Unpaid</span>}
          </div>

          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Monthly Fee</span>
              <span className="text-slate-200">₹{cell.amount}</span>
            </div>
            {cell.fine > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Late Fine</span>
                <span className="text-red-400 font-medium">+₹{cell.fine}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
              <span className="text-sm font-bold text-white">Total</span>
              <span className="text-xl font-black text-green-400">₹{cell.total}</span>
            </div>
          </div>

          {isPaid && cell.receiptNo && (
            <div className="flex items-center justify-between text-xs bg-slate-900/40 rounded-lg px-3 py-2">
              <span className="text-slate-500 font-mono">{cell.receiptNo}</span>
              {cell.paidAt && <span className="text-slate-500">{new Date(cell.paidAt).toLocaleDateString('en-IN')}</span>}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {isPaid ? (
              <>
                {cell._id && (
                  <Link href={`/receipt/${cell._id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-xl text-sm font-medium transition-all">
                    <FileText size={15} /> Receipt
                  </Link>
                )}
                <button onClick={onUndo} disabled={working}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600/90 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all">
                  {working ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Undo
                </button>
              </>
            ) : (
              <button onClick={onMarkPaid} disabled={working}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-900/30 active:scale-95">
                {working ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Mark as Paid
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Summary stat pill ────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className={`card p-4 md:p-5 relative overflow-hidden group`}>
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 ${color} blur-2xl group-hover:opacity-20 transition-opacity`} />
      <div className="flex items-center gap-3 relative z-10">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}/15`}>
          <Icon size={18} className={color.replace('bg-', 'text-')} />
        </div>
        <div className="min-w-0">
          <p className="text-xl md:text-2xl font-black text-white tracking-tight truncate">{value}</p>
          <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function MatrixClient({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  const nowYear = new Date().getFullYear()
  const [year, setYear] = useState(nowYear)
  const [data, setData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<{ rowIdx: number; monthIdx: number } | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  const fetchMatrix = useCallback(async (y: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/payments/matrix?year=${y}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to load matrix')
      setData(d)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMatrix(year) }, [year, fetchMatrix])

  const filteredPlayers = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.players
    return data.players.filter(p => p.name.toLowerCase().includes(q) || p.phone.includes(q))
  }, [data, search])

  // Summary is computed server-side (keeps the client light and fast)
  const summary: Summary = data?.summary ?? { collected: 0, outstanding: 0, fullyPaid: 0, totalPaidCells: 0, playerCount: 0 }

  async function markPaid(row: Row, monthIdx: number) {
    setWorking(true)
    setError('')
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: row._id, month: monthIdx + 1, year }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`)
      await fetchMatrix(year)
      setSelected(null)
    } catch (e: any) {
      setError(e.message || 'Failed to mark paid')
    } finally {
      setWorking(false)
    }
  }

  async function undoPaid(cell: Cell) {
    if (!cell._id) return
    setWorking(true)
    setError('')
    try {
      const res = await fetch(`/api/payments/${cell._id}`, { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`)
      await fetchMatrix(year)
      setSelected(null)
    } catch (e: any) {
      setError(e.message || 'Failed to undo')
    } finally {
      setWorking(false)
    }
  }

  // Resolve the currently-selected row + cell from filtered list
  const activeRow = selected ? filteredPlayers[selected.rowIdx] : null
  const activeCell = activeRow && selected ? activeRow.cells[selected.monthIdx] : null

  return (
    <AdminLayout adminName={adminName} adminEmail={adminEmail}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-2.5 py-0.5 rounded-full">
                <Grid3x3 size={11} /> Payment Matrix
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Fee Grid <span className="text-indigo-400">{year}</span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Every player · every month · tap a cell to manage</p>
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1.5">
            <button onClick={() => setYear(y => y - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <CalendarDays size={15} className="text-indigo-400" />
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="bg-transparent text-white font-bold text-lg focus:outline-none cursor-pointer appearance-none pr-1">
                {[nowYear + 1, nowYear, nowYear - 1, nowYear - 2, nowYear - 3].map(y => (
                  <option key={y} value={y} className="bg-slate-800">{y}</option>
                ))}
              </select>
            </div>
            <button onClick={() => setYear(y => y + 1)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <MatrixSkeleton />
        ) : !data ? (
          <div className="card p-12 text-center text-slate-500">No data available for {year}</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatPill icon={Wallet} label={`Collected in ${year}`} value={`₹${summary.collected.toLocaleString('en-IN')}`} color="bg-green-500" />
              <StatPill icon={TrendingUp} label="Outstanding dues" value={`₹${summary.outstanding.toLocaleString('en-IN')}`} color="bg-red-500" />
              <StatPill icon={Sparkles} label="Fully paid up" value={`${summary.fullyPaid}/${data.players.length}`} color="bg-indigo-500" />
              <StatPill icon={CheckCircle2} label="Payments recorded" value={String(summary.totalPaidCells)} color="bg-yellow-500" />
            </div>

            {/* Search + legend */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input className="input-field pl-10 text-sm py-2.5" placeholder="Search player..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/80" /> Paid</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-500/70" /> Unpaid</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/70" /> Late</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-600/50" /> Upcoming</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" /> N/A</span>
              </div>
            </div>

            {/* The Matrix */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto matrix-scroll">
                <table className="w-full border-separate border-spacing-0">
                  {/* Header */}
                  <thead>
                    <tr>
                      <th className="matrix-sticky-col matrix-corner text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider z-20">
                        Player
                      </th>
                      {MONTHS_SHORT.map((m, i) => {
                        const isCurrent = data.year === data.currentYear && i + 1 === data.currentMonth
                        return (
                          <th key={m} className={`px-1 py-3 text-center text-[11px] font-bold uppercase tracking-wider min-w-[52px] ${isCurrent ? 'text-indigo-300 bg-indigo-500/10' : 'text-slate-500'}`}>
                            {m}
                          </th>
                        )
                      })}
                      <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-[70px] bg-slate-800/40">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="text-center py-16 text-slate-500">
                          <Users size={28} className="mx-auto mb-2 text-slate-600" />
                          No players match “{search}”
                        </td>
                      </tr>
                    ) : filteredPlayers.map((row, rowIdx) => (
                      <tr key={row._id} className="group">
                        {/* Sticky player name */}
                        <td className="matrix-sticky-col px-4 py-2 z-10">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                              {row.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-white truncate max-w-[120px] flex items-center gap-1">
                                {row.name}
                                {row.isCaptain && <Crown size={11} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                              </p>
                              <p className="text-[10px] text-slate-500">{row.paidMonths}/{data.applicableMonths} paid</p>
                            </div>
                          </div>
                        </td>

                        {/* Month cells */}
                        {row.cells.map((cell, monthIdx) => {
                          // Not applicable (before July 2026) — render an inert, muted cell.
                          if (cell.status === 'na') {
                            return (
                              <td key={monthIdx} className="p-0.5 text-center">
                                <div className="matrix-cell !cursor-default bg-slate-800/40 text-slate-700"
                                  title={`${MONTHS_LONG[monthIdx]} ${year} · No fee (structure started July 2026)`}>
                                  –
                                </div>
                              </td>
                            )
                          }

                          const base = 'matrix-cell'
                          let cls = 'bg-slate-700/20 text-slate-600 hover:bg-slate-600/30'
                          let content: React.ReactNode = '·'
                          if (cell.status === 'paid') {
                            cls = 'bg-green-500/20 text-green-300 hover:bg-green-500/35 ring-1 ring-inset ring-green-500/30'
                            content = <CheckCircle2 size={14} className="mx-auto" />
                          } else if (cell.status === 'pending') {
                            if (cell.fine > 0) {
                              cls = 'bg-red-500/15 text-red-300 hover:bg-red-500/30 ring-1 ring-inset ring-red-500/25'
                              content = <span className="text-[10px] font-bold">₹{cell.total}</span>
                            } else {
                              cls = 'bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/30 ring-1 ring-inset ring-yellow-500/20'
                              content = <Clock size={13} className="mx-auto" />
                            }
                          }
                          return (
                            <td key={monthIdx} className="p-0.5 text-center">
                              <button
                                onClick={() => setSelected({ rowIdx, monthIdx })}
                                className={`${base} ${cls}`}
                                title={`${row.name} · ${MONTHS_LONG[monthIdx]} ${year} · ${cell.status === 'paid' ? 'Paid ₹' + cell.total : cell.status === 'pending' ? 'Unpaid ₹' + cell.total : 'Upcoming'}`}
                              >
                                {content}
                              </button>
                            </td>
                          )
                        })}

                        {/* Row total */}
                        <td className="px-3 py-2 text-center bg-slate-800/30">
                          <span className="text-[13px] font-bold text-green-400">₹{row.paidTotal.toLocaleString('en-IN')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Footer — per-month totals */}
                  {filteredPlayers.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-800/50">
                        <td className="matrix-sticky-col matrix-corner px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider z-20">
                          Collected
                        </td>
                        {data.monthTotals.map((t, i) => (
                          <td key={i} className="px-1 py-3 text-center">
                            <span className={`text-[11px] font-semibold ${t > 0 ? 'text-green-400' : 'text-slate-600'}`}>
                              {t > 0 ? `₹${t}` : '—'}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center bg-slate-800/60">
                          <span className="text-[13px] font-black text-green-400">₹{data.grandTotal.toLocaleString('en-IN')}</span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <p className="text-center text-xs text-slate-600">
              Showing {filteredPlayers.length} of {data.players.length} players · ₹{data.settings.monthlyFee}/month · Fine ₹{data.settings.dailyFine}/day after the {data.settings.dueDate}th
            </p>
          </>
        )}
      </div>

      {/* Cell modal */}
      {selected && activeRow && activeCell && (
        <CellModal
          row={activeRow}
          monthIndex={selected.monthIdx}
          cell={activeCell}
          year={year}
          working={working}
          onClose={() => { if (!working) setSelected(null) }}
          onMarkPaid={() => markPaid(activeRow, selected.monthIdx)}
          onUndo={() => undoPaid(activeCell)}
        />
      )}
    </AdminLayout>
  )
}
