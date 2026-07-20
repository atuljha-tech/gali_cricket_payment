import { Camera, Loader2, Star, Trophy, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function PublicGalleryHeader() {
  return (
    <header className="bg-slate-900/95 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
            <Star size={15} className="text-white fill-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">GOC Memories</p>
            <p className="text-[10px] text-slate-500">Gali Online Cricket · Gallery</p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 pitch-bg text-slate-100">
      <PublicGalleryHeader />
      
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(250,204,21,0.08),transparent_70%)]" />
        <div className="absolute inset-0 pitch-bg opacity-20" />
        <div className="relative z-10 px-4 md:px-8 py-12 md:py-16 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400 bg-yellow-500/15 border border-yellow-500/25 px-3 py-1 rounded-full">
                  <Star size={11} className="fill-yellow-400" /> Community Gallery
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">GOC <span className="text-yellow-400">Memories</span></h1>
              <p className="text-slate-400 mt-2 max-w-md">Captured moments from the pitch. Every match, every celebration.</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Loader2 size={14} className="text-yellow-400 animate-spin" /> Counting photos...</span>
                <span className="flex items-center gap-1.5"><Trophy size={14} className="text-yellow-400" />Gali Online Cricket</span>
              </div>
            </div>
            <button disabled className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 opacity-50 text-slate-900 font-bold rounded-xl shadow-xl shadow-yellow-900/30 text-sm self-start md:self-auto cursor-not-allowed">
              <Camera size={18} /> Add Your Memory
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Mobile Game Style Progress Bar (Connecting State) */}
        <div className="mb-6 bg-slate-900/80 border border-yellow-500/30 rounded-2xl p-4 shadow-xl shadow-black/50 backdrop-blur-sm overflow-hidden relative">
          <div className="flex justify-between items-end mb-2 relative z-10">
            <span className="text-sm font-bold text-yellow-400 tracking-wide uppercase flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Connecting to server...
            </span>
            <span className="text-xs font-black text-yellow-500 bg-yellow-950/50 px-2 py-0.5 rounded-md border border-yellow-500/20">
              0%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative z-10">
            <div 
              className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-amber-300 transition-all duration-700 ease-out relative shadow-[0_0_10px_rgba(250,204,21,0.5)] w-[5%]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>

        <div className="gallery-grid">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl border border-slate-700/30 bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
