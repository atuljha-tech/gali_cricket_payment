import { Camera, Loader2, Star } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pitch-bg">
      <div className="sticky top-0 z-40 h-1 w-full bg-slate-900/90 backdrop-blur-xl">
        <div className="h-full w-3/4 bg-gradient-to-r from-yellow-500 via-amber-400 to-green-400 animate-pulse" />
      </div>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950" />
        <div className="relative z-10 px-4 md:px-8 py-12 md:py-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-4 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 w-fit text-yellow-300 text-xs font-semibold">
            <Loader2 size={12} className="animate-spin" />
            Loading gallery memories
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="h-4 w-36 rounded-full bg-white/10 skeleton" />
              <div className="h-11 w-80 max-w-full rounded-2xl bg-white/10 skeleton" />
              <div className="h-4 w-72 max-w-full rounded-full bg-white/10 skeleton" />
              <div className="flex items-center gap-4 pt-2">
                <div className="h-4 w-24 rounded-full bg-white/10 skeleton" />
                <div className="h-4 w-28 rounded-full bg-white/10 skeleton" />
              </div>
            </div>
            <div className="h-12 w-44 rounded-xl bg-yellow-500/20 skeleton" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          <div className="flex items-center gap-2">
            <Camera size={15} />
            First 12 photos are loading
          </div>
          <span className="text-xs font-semibold">0%</span>
        </div>

        <div className="gallery-grid">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl border border-slate-700/30 bg-slate-800/60 skeleton" />
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 py-6 text-slate-500 text-sm">
          <Star size={14} className="text-yellow-400" />
          Preparing the next batch in the background
        </div>
      </div>
    </div>
  )
}
