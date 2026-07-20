'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCcw, Star } from 'lucide-react'

export default function GalleryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Gallery] Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
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

      {/* Error body */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/30 rounded-3xl flex items-center justify-center mb-6">
          <span className="text-4xl">📷</span>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Gallery Failed to Load</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-8">
          Something went wrong while loading the gallery. Please try again.
        </p>
        {error?.digest && (
          <p className="text-xs text-slate-600 mb-6 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-all active:scale-95"
          >
            <RefreshCcw size={16} /> Try Again
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 rounded-xl transition-all"
          >
            <ArrowLeft size={16} /> Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
