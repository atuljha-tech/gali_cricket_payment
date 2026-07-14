'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Users, CheckCircle2, Clock, AlertCircle,
  IndianRupee, TrendingUp, TrendingDown, Wallet,
  BarChart3, ArrowRight, RefreshCw
} from 'lucide-react'
import { MONTH_NAMES } from '@/lib/fineCalculator'

interface StatsData {
  totalPlayers: number
  paidCount: number
  pendingCount: number
  lateCount: number
  thisMonthCollection: number
  totalCollection: number
  totalSpent: number
  availableBalance: number
  month: number
  year: number
}

function Pill({ label, value, icon: Icon, color }: {
  label: string; value: string | number
  icon: React.ElementType
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'orange'
}) {
  const styles = {
    green:  'bg-green-900/25 border-green-700/30 text-green-400',
    yellow: 'bg-yellow-900/25 border-yellow-700/30 text-yellow-400',
    red:    'bg-red-900/25 border-red-700/30 text-red-400',
    blue:   'bg-blue-900/25 border-blue-700/30 text-blue-400',
    purple: 'bg-purple-900/25 border-purple-700/30 text-purple-400',
    orange: 'bg-orange-900/25 border-orange-700/30 text-orange-400',
  }
  return (
    <div className={`flex flex-col gap-2 p-4 rounded-2xl border ${styles[color]}`}>
      <div className="flex items-center gap-2">
        <Icon size={15} />
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  )
}

export default function StatsClient() {
  const [data,    setData]    = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  async function load() {
    setLoading(true); setError(false)
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const paidPct = data ? Math.round((data.paidCount / Math.max(data.totalPlayers, 1)) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pitch-bg">

      {/* ── Header ── */}
      <header className="bg-slate-900/95 border-b border-slate-700/50 sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-purple-700/30 flex-shrink-0">
              <Image src="/goc-logo.png" alt="GOC" width={32} height={32} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">GOC Overview</p>
              <p className="text-[10px] text-slate-500">Public · Read-only stats</p>
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 border border-slate-600/50 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-900 via-green-950 to-slate-900 border border-green-500/20 shadow-[0_0_40px_-15px_rgba(34,197,94,0.5)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(34,197,94,0.15),transparent_70%)]" />
          <div className="absolute inset-0 pitch-bg opacity-20" />
          <div className="relative z-10 px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/15 border border-green-500/25 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Live Season
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white">
                {loading || !data
                  ? 'Loading…'
                  : `${MONTH_NAMES[data.month]} ${data.year}`}
              </h1>
              <p className="text-slate-400 text-sm mt-1">Gali Online Cricket · Season overview</p>
            </div>

            {/* Progress ring */}
            {data && !loading && (
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 flex-shrink-0">
                <div className="relative w-14 h-14">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" strokeWidth="3"
                      strokeDasharray={`${paidPct * 88 / 100} 88`} strokeLinecap="round"/>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{paidPct}%</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Fee collected</p>
                  <p className="text-lg font-bold text-white">{data.paidCount}/{data.totalPlayers} paid</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-800/60 animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <BarChart3 size={32} className="text-slate-600" />
            <p className="text-slate-400 font-medium">Couldn&apos;t load stats</p>
            <button onClick={load} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-medium transition-all">
              Try again
            </button>
          </div>
        ) : data ? (
          <>
            {/* Payment stats */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Payment Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Pill label="Players"  value={data.totalPlayers}  icon={Users}        color="blue"   />
                <Pill label="Paid"     value={data.paidCount}     icon={CheckCircle2} color="green"  />
                <Pill label="Pending"  value={data.pendingCount}  icon={Clock}        color="yellow" />
                <Pill label="Overdue"  value={data.lateCount}     icon={AlertCircle}  color="red"    />
              </div>
            </div>

            {/* Fund stats */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Fund Overview</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Pill label="This Month" value={`₹${data.thisMonthCollection}`} icon={IndianRupee}  color="green"  />
                <Pill label="All-time Collected" value={`₹${data.totalCollection}`}   icon={TrendingUp}   color="purple" />
                <Pill label="Total Spent"   value={`₹${data.totalSpent}`}        icon={TrendingDown} color="orange" />
                <Pill label="Balance"       value={`₹${data.availableBalance}`}  icon={Wallet}
                  color={data.availableBalance >= 0 ? 'green' : 'red'} />
              </div>
            </div>

            {/* Balance bar */}
            {data.totalCollection > 0 && (
              <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">Fund utilisation</p>
                  <p className="text-xs text-slate-400">
                    ₹{data.totalSpent} spent of ₹{data.totalCollection} collected
                  </p>
                </div>
                <div className="w-full bg-slate-700/60 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, (data.totalSpent / data.totalCollection) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-2">
                  <span className="text-red-400 font-medium">{Math.round((data.totalSpent / data.totalCollection) * 100)}% used</span>
                  <span className="text-green-400 font-medium">₹{data.availableBalance} remaining</span>
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/fund"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-red-900/20 to-slate-900/40 border border-red-800/25 rounded-xl hover:border-red-700/40 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingDown size={16} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Fund Spending</p>
                    <p className="text-xs text-slate-500">Itemised expense log</p>
                  </div>
                </div>
                <ArrowRight size={15} className="text-slate-600 group-hover:text-red-400 transition-colors" />
              </Link>
              <Link href="/gallery"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-900/20 to-slate-900/40 border border-amber-800/25 rounded-xl hover:border-amber-700/40 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BarChart3 size={16} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">GOC Memories</p>
                    <p className="text-xs text-slate-500">Photo gallery</p>
                  </div>
                </div>
                <ArrowRight size={15} className="text-slate-600 group-hover:text-amber-400 transition-colors" />
              </Link>
            </div>
          </>
        ) : null}

        <p className="text-center text-xs text-slate-700 pb-4">
          GOC · Gali Online Cricket · Public read-only view
        </p>
      </div>
    </div>
  )
}
