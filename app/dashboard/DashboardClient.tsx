'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import StatCard from '@/components/StatCard'
import {
  Users, CheckCircle2, Clock, AlertCircle,
  IndianRupee, TrendingUp, ChevronRight,
  Trophy, Zap, Calendar, ArrowUpRight
} from 'lucide-react'
import { MONTH_NAMES } from '@/lib/fineCalculator'

interface DashboardData {
  totalPlayers: number
  paidCount: number
  pendingCount: number
  lateCount: number
  thisMonthCollection: number
  totalCollection: number
  month: number
  year: number
}

function HeroSection({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const now = new Date()
  return (
    <div className="relative overflow-hidden rounded-2xl mb-6">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-950 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(34,197,94,0.15),transparent_70%)]" />
      <div className="absolute inset-0 pitch-bg opacity-30" />

      {/* Field arc decorations */}
      <div className="absolute -bottom-16 -right-16 w-64 h-64 border-2 border-green-500/10 rounded-full" />
      <div className="absolute -bottom-8 -right-8 w-40 h-40 border-2 border-green-500/10 rounded-full" />
      <div className="absolute top-4 right-32 w-2 h-2 bg-green-400/40 rounded-full animate-pulse-slow" />
      <div className="absolute top-12 right-48 w-1.5 h-1.5 bg-yellow-400/40 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/15 border border-green-500/25 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Live Season
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {loading ? 'Loading...' : `${MONTH_NAMES[data?.month ?? now.getMonth() + 1]} ${data?.year ?? now.getFullYear()}`}
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Cricket fee collection overview</p>
          </div>

          {!loading && data && (
            <div className="flex items-center gap-6">
              {/* Mini progress ring */}
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-3.5">
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke="#22c55e" strokeWidth="3"
                      strokeDasharray={`${(data.paidCount / Math.max(data.totalPlayers, 1)) * 88} 88`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {Math.round((data.paidCount / Math.max(data.totalPlayers, 1)) * 100)}%
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Collection Rate</p>
                  <p className="text-lg font-bold text-white">{data.paidCount}/{data.totalPlayers}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardClient({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <AdminLayout adminName={adminName} adminEmail={adminEmail}>
      <HeroSection data={data} loading={loading} />

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="w-11 h-11 bg-slate-700 rounded-xl mb-4" />
              <div className="h-8 bg-slate-700 rounded-lg w-1/2 mb-2" />
              <div className="h-3 bg-slate-700/60 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total Players"
            value={data.totalPlayers}
            icon={Users}
            color="blue"
            subtitle="Active members"
          />
          <StatCard
            title="Paid"
            value={data.paidCount}
            icon={CheckCircle2}
            color="green"
            subtitle={`${Math.round((data.paidCount / Math.max(data.totalPlayers, 1)) * 100)}% of total`}
            trend="This month"
          />
          <StatCard
            title="Pending"
            value={data.pendingCount}
            icon={Clock}
            color="yellow"
            subtitle="Yet to pay"
          />
          <StatCard
            title="Late Payments"
            value={data.lateCount}
            icon={AlertCircle}
            color="red"
            subtitle="Past due date"
          />
          <StatCard
            title="This Month"
            value={`₹${data.thisMonthCollection}`}
            icon={IndianRupee}
            color="green"
            subtitle="Collected"
          />
          <StatCard
            title="Total Collected"
            value={`₹${data.totalCollection}`}
            icon={TrendingUp}
            color="purple"
            subtitle="All time"
          />
        </div>
      ) : (
        <div className="card p-10 text-center text-slate-500 mb-6">Failed to load dashboard data</div>
      )}

      {/* Quick Actions + Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Actions */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-yellow-400" />
            <h2 className="font-bold text-white text-sm">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/players', label: 'Mark Payments', icon: CheckCircle2, color: 'from-green-600 to-green-700', shadow: 'shadow-green-900/30' },
              { href: '/players?action=add', label: 'Add Player', icon: Users, color: 'from-blue-600 to-blue-700', shadow: 'shadow-blue-900/30' },
              { href: '/history', label: 'View History', icon: TrendingUp, color: 'from-purple-600 to-purple-700', shadow: 'shadow-purple-900/30' },
              { href: '/settings', label: 'Settings', icon: Trophy, color: 'from-slate-600 to-slate-700', shadow: 'shadow-slate-900/20' },
            ].map(({ href, label, icon: Icon, color, shadow }) => (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-2.5 p-4 bg-gradient-to-br ${color} rounded-xl text-white text-xs font-semibold shadow-lg ${shadow} hover:opacity-90 hover:scale-105 transition-all duration-200 text-center`}
              >
                <Icon size={20} />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Status panel */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-slate-400" />
            <h2 className="font-bold text-white text-sm">Season Status</h2>
          </div>
          {data && (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-xs text-slate-400">Collection</span>
                <span className="text-sm font-bold text-green-400">₹{data.thisMonthCollection}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-xs text-slate-400">Pending dues</span>
                <span className="text-sm font-bold text-yellow-400">{data.pendingCount} players</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-slate-400">Overdue</span>
                <span className="text-sm font-bold text-red-400">{data.lateCount} players</span>
              </div>
              <Link
                href="/players"
                className="flex items-center justify-between w-full mt-2 p-3 bg-green-600/15 hover:bg-green-600/25 border border-green-600/25 rounded-xl text-sm font-semibold text-green-400 transition-all duration-200"
              >
                Manage Payments
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          {!data && !loading && <p className="text-slate-500 text-xs">No data</p>}
        </div>
      </div>

      {/* Overdue alert */}
      {data && data.lateCount > 0 && (
        <div className="mt-5 flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-2xl px-5 py-4">
          <AlertCircle size={17} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-300">
              {data.lateCount} player{data.lateCount !== 1 ? 's are' : ' is'} past the due date
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Late fines are being added daily. Mark payments to stop accruing fines.
            </p>
          </div>
          <Link href="/players" className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1 flex-shrink-0">
            Resolve <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </AdminLayout>
  )
}
