import { Loader2, Star } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pitch-bg">
      <div className="sticky top-0 z-40 h-1 w-full bg-slate-900/90 backdrop-blur-xl">
        <div className="h-full w-2/3 bg-gradient-to-r from-green-500 via-emerald-400 to-yellow-400 animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          <Loader2 size={15} className="animate-spin" />
          <span>Loading home dashboard</span>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-900 via-green-950 to-slate-900 border border-green-500/25">
          <div className="relative z-10 px-5 py-6 flex items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="h-4 w-24 rounded-full bg-white/10 skeleton" />
              <div className="h-8 w-56 rounded-xl bg-white/10 skeleton" />
              <div className="h-3 w-40 rounded-full bg-white/10 skeleton" />
            </div>
            <div className="h-10 w-28 rounded-xl bg-white/10 skeleton" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3.5">
              <div className="h-4 w-10 rounded-full bg-white/10 skeleton mb-3" />
              <div className="h-7 w-14 rounded-lg bg-white/10 skeleton mb-2" />
              <div className="h-3 w-20 rounded-full bg-white/10 skeleton" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="h-11 rounded-xl bg-slate-800/60 skeleton" />
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Star size={14} className="text-green-400" />
              Preparing player list
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-800/60 skeleton" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
