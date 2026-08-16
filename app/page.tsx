'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search, QrCode, CheckCircle2, Clock,
  Star, Camera, ArrowRight, Shield, Users, IndianRupee,
  Crown, Wallet, BarChart3, Menu, X, Loader2
} from 'lucide-react'
import { MONTH_NAMES } from '@/lib/fineCalculator'
import PlayerCard from '@/components/PlayerCard'

interface PlayerRow {
  _id: string
  name: string
  phone?: string
  role?: string
  battingStyle?: string
  bowlingArm?: string
  bowlingType?: string
  jerseyNumber?: number
  isCaptain?: boolean
  creditBalance?: number
  dueBalance?: number
  advanceMonths?: number      // full future months the credit covers
  creditRemainder?: number    // leftover credit after advance months
  paidMonthsCount?: number    // total months paid all-time
  payment: {
    _id?: string
    status: 'paid' | 'pending' | 'partial'
    fine: number
    amount: number
    total: number
    receiptNo?: string
    paidAt?: string
    adminId?: { name: string } | string
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getLastPaidMonth(paidAt?: string): string {
  if (!paidAt) return '—'
  const d = new Date(paidAt)
  return `${MONTH_NAMES[d.getMonth() + 1]} ${d.getFullYear()}`
}

export default function HomePage() {
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [settings, setSettings]   = useState({ monthlyFee: 30 })
  const [cardPlayer, setCardPlayer] = useState<PlayerRow | null>(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)

  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res  = await fetch(
        `/api/players?search=${encodeURIComponent(search)}&month=${month}&year=${year}`,
        { next: { revalidate: 30 } }
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || `Failed to load players (${res.status})`)
      setPlayers(data.players || [])
      if (data.settings) setSettings(data.settings)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }, [search, month, year])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(100)
      const reset = window.setTimeout(() => setLoadingProgress(0), 350)
      return () => window.clearTimeout(reset)
    }

    setLoadingProgress(12)
    const id = window.setInterval(() => {
      setLoadingProgress(curr => (curr >= 88 ? 88 : Math.min(88, curr + Math.max(2, Math.round((88 - curr) / 6)))))
    }, 160)

    return () => window.clearInterval(id)
  }, [loading])

  // Refresh when tab comes back into focus
  useEffect(() => {
    const onFocus = () => fetchPlayers()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchPlayers])

  const paid    = players.filter(p => p.payment.status === 'paid').length
  const pending = players.filter(p => p.payment.status !== 'paid').length

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pitch-bg">
      <div className="sticky top-0 z-40 h-1 w-full bg-slate-900/90 backdrop-blur-xl">
        <div
          className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-yellow-400 transition-all duration-200 ease-out"
          style={{ width: `${loadingProgress}%` }}
        />
      </div>

      {/* ── Top Nav ─────────────────────────────────────────────────── */}
      <header className="bg-slate-900/95 border-b border-slate-700/50 sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-purple-700/30 shadow-lg shadow-purple-900/30 flex-shrink-0">
              <Image src="/goc-logo.png" alt="GOC" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-black text-sm text-white tracking-tight">G.O.C</p>
              <p className="text-[10px] text-green-400 font-medium hidden sm:block">
                {MONTH_NAMES[month]} {year} · Gods of Cricket
              </p>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/stats"   className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25 rounded-lg text-xs font-semibold transition-all"><BarChart3 size={12} /> Stats</Link>
            <Link href="/fund"    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 rounded-lg text-xs font-semibold transition-all"><Wallet size={12} /> Spending</Link>
            <Link href="/fund-income" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 rounded-lg text-xs font-semibold transition-all"><IndianRupee size={12} /> Income</Link>
            <Link href="/gallery" className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 rounded-lg text-xs font-semibold transition-all"><Star size={12} className="fill-amber-400" /> Memories</Link>
            <Link href="/qr"      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 border border-slate-600/50 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"><QrCode size={12} /> Pay</Link>
            <Link href="/login"   className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-green-900/30"><Shield size={12} /> Admin</Link>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/qr"    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700/60 border border-slate-600/50 text-slate-300 rounded-lg text-xs font-medium"><QrCode size={12} /> Pay</Link>
            <Link href="/login" className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold"><Shield size={12} /> Admin</Link>
            <button onClick={() => setMenuOpen(o => !o)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-700/60 text-slate-300 hover:text-white transition-colors"
              aria-label="Toggle menu">
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-700/50 bg-slate-900/98 px-4 py-3 flex flex-col gap-2">
            <Link href="/stats"   onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold"><BarChart3 size={16} /> GOC Stats</Link>
            <Link href="/fund"    onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold"><Wallet size={16} /> Fund Spending</Link>
            <Link href="/fund-income" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold"><IndianRupee size={16} /> Fund Income</Link>
            <Link href="/gallery" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold"><Star size={16} className="fill-amber-400" /> GOC Memories</Link>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {loading && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            <div className="flex items-center gap-2">
              <Loader2 size={15} className="animate-spin" />
              <span>Loading players and season data</span>
            </div>
            <span className="text-xs font-semibold text-green-200">{loadingProgress}%</span>
          </div>
        )}

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-900 via-green-950 to-slate-900 border border-green-500/25 shadow-[0_0_50px_-20px_rgba(34,197,94,0.6)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(34,197,94,0.18),transparent_70%)]" />
          <div className="absolute -left-10 -top-10 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="relative z-10 px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-xl shadow-purple-900/40 flex-shrink-0 hidden sm:block">
                <Image src="/goc-logo.png" alt="GOC" width={56} height={56} className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl font-black gradient-text">{MONTH_NAMES[month]} {year}</h1>
                <p className="text-xs text-slate-400 mt-0.5">Monthly cricket fee — ₹{settings.monthlyFee}/month</p>
              </div>
            </div>
            <Link href="/qr"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-green-900/30 active:scale-95">
              <QrCode size={13} /> Pay Now <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        {/* Stat pills — no fine stat */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Players', val: players.length, icon: Users,        color: 'text-white',    bg: 'bg-slate-800/60 border-slate-700/50' },
            { label: 'Paid',          val: paid,           icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/20 border-green-800/30' },
            { label: 'Pending',       val: pending,        icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/30' },
          ].map(({ label, val, icon: Icon, color, bg }) => (
            <div key={label} className={`border ${bg} rounded-xl p-3.5 flex items-center gap-3`}>
              <Icon size={18} className={color} />
              <div>
                <p className={`text-xl font-black ${color}`}>{val}</p>
                <p className="text-[11px] text-slate-500 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full bg-slate-800/60 border border-slate-700/50 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
            placeholder="Search player name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Players Table */}
        <div className="card overflow-hidden">
          {loadError && !loading && (
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-red-500/20 bg-red-500/10">
              <p className="text-sm font-semibold text-red-300">{loadError}</p>
              <button onClick={fetchPlayers} className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/15 text-red-200 border border-red-500/20 hover:bg-red-500/20">Retry</button>
            </div>
          )}

          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700/40 bg-slate-800/40">
            <Shield size={13} className="text-green-400 flex-shrink-0" />
            <p className="text-xs text-slate-400">
              Public read-only view ·&nbsp;
              <Link href="/login" className="text-green-400 hover:text-green-300 underline underline-offset-2">Admin login</Link>
              &nbsp;to manage payments
            </p>
          </div>

          {/* Desktop header — 6 columns: Player, Status, Credit/Advance, Last Paid Month, Last Payment Date, Marked By */}
          <div className="hidden md:grid md:grid-cols-[2fr_110px_160px_150px_140px_130px] gap-3 px-5 py-3 border-b border-slate-700/40 bg-slate-900/40">
            {['Player', 'Status', 'Advance / Credit', 'Last Paid Month', 'Last Payment Date', 'Marked By'].map(h => (
              <span key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {loading ? (
            <div className="divide-y divide-slate-700/30">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-slate-700 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-700 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-700/60 rounded w-1/4" />
                  </div>
                  <div className="h-6 bg-slate-700 rounded-full w-16" />
                </div>
              ))}
            </div>
          ) : players.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No players found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {players.map((player, idx) => {
                const isPaid   = player.payment.status === 'paid'
                const isPartial = player.payment.status === 'partial'

                const markedBy = (() => {
                  const a = player.payment.adminId
                  if (!a) return '—'
                  if (typeof a === 'object' && 'name' in a) return (a as { name: string }).name
                  return '—'
                })()

                const avatarBg = isPaid
                  ? 'from-green-600 to-green-800'
                  : isPartial
                  ? 'from-blue-600 to-blue-800'
                  : 'from-yellow-600 to-amber-800'

                return (
                  <div key={player._id}
                    onClick={() => setCardPlayer(player)}
                    className={`group cursor-pointer transition-colors duration-150 ${isPaid ? 'hover:bg-green-900/10' : 'hover:bg-slate-700/20'}`}>

                    {/* Mobile */}
                    <div className="md:hidden px-4 py-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${avatarBg} flex-shrink-0`}>
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white flex items-center gap-1">
                              {player.name}
                              {player.isCaptain && <Crown size={11} className="text-yellow-400 fill-yellow-400" />}
                            </p>
                            <p className="text-[10px] text-slate-500">#{idx + 1}</p>
                          </div>
                        </div>
                        {isPaid
                          ? <span className="badge-paid"><CheckCircle2 size={10} />Paid</span>
                          : isPartial
                          ? <span className="badge-pending"><IndianRupee size={10} />Partial</span>
                          : <span className="badge-pending"><Clock size={10} />Pending</span>}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{getLastPaidMonth(player.payment.paidAt)}</span>
                        {markedBy !== '—' && <span className="text-green-400/70">by {markedBy}</span>}
                      </div>
                      {/* Credit / advance info */}
                      {((player.advanceMonths ?? 0) > 0 || (player.creditRemainder ?? 0) > 0) && (
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          {(player.advanceMonths ?? 0) > 0 && (
                            <span className="text-blue-400 font-semibold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                              {player.advanceMonths} mo advance
                            </span>
                          )}
                          {(player.creditRemainder ?? 0) > 0 && (
                            <span className="text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                              +₹{player.creditRemainder} credit
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Desktop */}
                    <div className="hidden md:grid md:grid-cols-[2fr_110px_160px_150px_140px_130px] gap-3 px-5 py-3.5 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${avatarBg} flex-shrink-0`}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate flex items-center gap-1">
                            {player.name}
                            {player.isCaptain && <Crown size={11} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                          </p>
                          <p className="text-[10px] text-slate-600">#{idx + 1}</p>
                        </div>
                      </div>

                      <div>
                        {isPaid
                          ? <span className="badge-paid"><CheckCircle2 size={10} />Paid</span>
                          : isPartial
                          ? <span className="badge-pending"><IndianRupee size={10} />Partial</span>
                          : <span className="badge-pending"><Clock size={10} />Pending</span>}
                      </div>

                      {/* Advance / Credit column */}
                      <div className="text-xs space-y-0.5">
                        {(player.advanceMonths ?? 0) > 0 && (
                          <p className="text-blue-400 font-semibold">{player.advanceMonths} mo advance</p>
                        )}
                        {(player.creditRemainder ?? 0) > 0 && (
                          <p className="text-blue-300">+₹{player.creditRemainder} credit</p>
                        )}
                        {!(player.advanceMonths ?? 0) && !(player.creditRemainder ?? 0) && (
                          <p className="text-slate-600">—</p>
                        )}
                      </div>

                      {/* Last Paid Month */}
                      <p className="text-xs text-slate-300">
                        {isPaid ? getLastPaidMonth(player.payment.paidAt) : '—'}
                      </p>

                      {/* Last Payment Date */}
                      <p className="text-xs text-slate-400">{formatDate(player.payment.paidAt)}</p>

                      {/* Marked By */}
                      <p className={`text-xs truncate ${markedBy !== '—' ? 'text-green-400/80' : 'text-slate-600'}`}>
                        {markedBy}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!loading && players.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-700/40 bg-slate-900/30 flex items-center justify-between">
              <p className="text-xs text-slate-500">{players.length} players · {paid} paid · {pending} pending</p>
              <p className="text-xs text-slate-600">₹{settings.monthlyFee}/month</p>
            </div>
          )}
        </div>

        {/* Gallery teaser */}
        <Link href="/gallery"
          className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-amber-900/20 to-slate-900/40 border border-amber-800/25 rounded-xl hover:border-amber-700/40 transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Camera size={17} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">GOC Memories</p>
              <p className="text-xs text-slate-500">Browse the cricket photo gallery</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-600 group-hover:text-amber-400 transition-colors" />
        </Link>

        {/* Fund teaser */}
        <Link href="/fund"
          className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-red-900/20 to-slate-900/40 border border-red-800/25 rounded-xl hover:border-red-700/40 transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wallet size={17} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Fund Spending</p>
              <p className="text-xs text-slate-500">See how the collected fund is being used</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-600 group-hover:text-red-400 transition-colors" />
        </Link>

        <p className="text-center text-xs text-slate-700 pb-2">GOC · Gali Online Cricket · {year} · Read-only public view</p>
      </div>

      {cardPlayer && (
        <PlayerCard player={cardPlayer} onClose={() => setCardPlayer(null)} />
      )}
    </div>
  )
}
