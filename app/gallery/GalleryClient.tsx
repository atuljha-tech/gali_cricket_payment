'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import Link from 'next/link'
import {
  Upload, X, Image as ImageIcon, Loader2,
  Camera, Star, Trophy, ArrowLeft,
  ChevronLeft, ChevronRight
} from 'lucide-react'

interface Photo {
  _id: string
  url: string
  thumbnailUrl: string
  uploadedAt: string
  uploaderName?: string
}

// ── Compress via canvas before sending to server ──────────────────────────────
function compressImage(file: File, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

// ── Lightbox with prev / next navigation ─────────────────────────────────────
function Lightbox({
  photos, index, onClose, onNav,
}: {
  photos: Photo[]
  index: number
  onClose: () => void
  onNav: (newIndex: number) => void
}) {
  const photo = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowLeft'  && hasPrev) onNav(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onNav(index + 1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [index, hasPrev, hasNext, onClose, onNav])

  // Touch swipe
  const touchStartX = useRef<number>(0)
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 50  && hasNext) onNav(index + 1)
    if (diff < -50 && hasPrev) onNav(index - 1)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/96 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
      >
        <X size={18} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-xs text-white/60 bg-black/40 px-3 py-1 rounded-full">
        {index + 1} / {photos.length}
      </div>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNav(index - 1) }}
          className="absolute left-3 md:left-6 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all active:scale-95"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Image */}
      <img
        src={photo.url}
        alt={photo.uploaderName || 'GOC memory'}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      {/* Next */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNav(index + 1) }}
          className="absolute right-3 md:right-6 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all active:scale-95"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Caption */}
      {(photo.uploaderName && photo.uploaderName !== 'Anonymous') && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-xs text-white/60 bg-black/40 px-3 py-1 rounded-full">
          📸 {photo.uploaderName} · {new Date(photo.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      )}
    </div>
  )
}

// ── Multi-Upload Modal ────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [previews, setPreviews]         = useState<{ file: File; objectUrl: string }[]>([])
  const [uploaderName, setUploaderName] = useState('')
  const [loading, setLoading]           = useState(false)
  const [done, setDone]                 = useState(0)
  const [error, setError]               = useState('')
  const [dragOver, setDragOver]         = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 15 * 1024 * 1024)
    const skipped = Array.from(files).length - arr.length
    if (skipped) setError(`${skipped} file(s) skipped (not an image or over 15MB)`)
    setPreviews(prev => {
      const newOnes = arr.filter(f => !prev.some(p => p.file.name === f.name && p.file.size === f.size))
      return [...prev, ...newOnes.map(f => ({ file: f, objectUrl: URL.createObjectURL(f) }))]
    })
  }

  function removePreview(idx: number) {
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx].objectUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function handleUpload() {
    if (!previews.length) return
    setLoading(true); setError(''); setDone(0)
    const name = uploaderName.trim() || 'Anonymous'
    const total = previews.length

    // Compress all first (parallel — fast)
    const compressed = await Promise.all(
      previews.map(p => compressImage(p.file, 1400, 0.82))
    )

    // Upload in batches of 4 (parallel per batch)
    let completed = 0
    const BATCH = 4
    for (let i = 0; i < compressed.length; i += BATCH) {
      await Promise.all(
        compressed.slice(i, i + BATCH).map(async imageData => {
          try {
            const res = await fetch('/api/gallery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageData, uploaderName: name }),
            })
            if (!res.ok) setError('Some uploads failed — check your connection')
          } catch {
            setError('Network error during upload')
          } finally {
            completed++
            setDone(completed)
          }
        })
      )
    }

    setLoading(false)
    onSuccess()
    onClose()
  }

  const progress = previews.length ? Math.round((done / previews.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-green-400" />
            <h2 className="font-bold text-white">Add to GOC Memories</h2>
            {previews.length > 0 && (
              <span className="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-2 py-0.5 rounded-full font-semibold">
                {previews.length} selected
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer p-8 ${dragOver ? 'border-green-500 bg-green-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && addFiles(e.target.files)} />
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-slate-700/60 rounded-2xl flex items-center justify-center">
                <Upload size={22} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">Drop photos here or click to browse</p>
                <p className="text-xs text-slate-500 mt-1">JPG · PNG · WEBP · up to 15MB each · select as many as you want</p>
              </div>
              {previews.length > 0 && <p className="text-xs text-green-400 font-semibold">Click to add more</p>}
            </div>
          </div>

          {/* Preview grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {previews.map((item, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-700/40 group">
                  <img src={item.objectUrl} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePreview(idx)}
                    className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-all">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Uploader name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Your Name (optional)</label>
            <input className="bg-slate-900/80 border border-slate-600/60 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
              placeholder="e.g. Rahul Kumar"
              value={uploaderName}
              onChange={e => setUploaderName(e.target.value)}
            />
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading {done}/{previews.length}…</span>
                <span className="text-green-400 font-semibold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5 pt-3 border-t border-slate-700/40 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-xl text-sm font-medium transition-all">Cancel</button>
          <button onClick={handleUpload} disabled={!previews.length || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-green-900/30">
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> {progress}%</>
              : <><Upload size={15} /> Upload {previews.length > 0 ? `${previews.length} ` : ''}Photo{previews.length !== 1 ? 's' : ''}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Public header ─────────────────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
// No props needed — admin status detected client-side via /api/auth/me
export default function GalleryClient() {
  const [photos, setPhotos]           = useState<Photo[]>([])
  const [loading, setLoading]         = useState(true)
  const [isAdmin, setIsAdmin]         = useState(false)
  const [adminName, setAdminName]     = useState<string | undefined>()
  const [adminEmail, setAdminEmail]   = useState<string | undefined>()
  const [showUpload, setShowUpload]   = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [page, setPage]               = useState(1)
  const [pages, setPages]             = useState(1)
  const [total, setTotal]             = useState(0)

  const fetchPhotos = useCallback(async (p = 1) => {
    try {
      const res = await fetch(`/api/gallery?page=${p}&limit=24`)
      const data = await res.json()
      setPhotos(prev => p === 1 ? (data.photos || []) : [...prev, ...(data.photos || [])])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    } finally {
      if (p === 1) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Fire both in parallel — photos load immediately, admin check in background
    fetchPhotos(1)
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.admin) {
          setIsAdmin(true)
          setAdminName(d.admin.name)
          setAdminEmail(d.admin.email)
        }
      })
      .catch(() => {})
  }, [fetchPhotos])

  const Content = (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(250,204,21,0.08),transparent_70%)]" />
        <div className="absolute inset-0 pitch-bg opacity-20" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-yellow-400/30 rounded-full animate-pulse-slow"
            style={{ top: `${20 + i * 12}%`, left: `${10 + i * 15}%`, animationDelay: `${i * 0.5}s` }} />
        ))}
        <div className="relative z-10 px-4 md:px-8 py-12 md:py-16 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400 bg-yellow-500/15 border border-yellow-500/25 px-3 py-1 rounded-full">
                  <Star size={11} className="fill-yellow-400" /> Community Gallery
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                GOC <span className="text-yellow-400">Memories</span>
              </h1>
              <p className="text-slate-400 mt-2 text-base max-w-md">
                Captured moments from the pitch. Every match, every celebration.
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Camera size={14} className="text-yellow-400" />{total} photo{total !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1.5"><Trophy size={14} className="text-yellow-400" />Gali Online Cricket</span>
              </div>
            </div>
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-bold rounded-xl shadow-xl shadow-yellow-900/30 transition-all duration-200 active:scale-95 text-sm self-start md:self-auto">
              <Camera size={18} /> Add Your Memory
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {loading && photos.length === 0 ? (
          <div className="gallery-grid">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square bg-slate-800/60 rounded-xl animate-pulse border border-slate-700/30" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-slate-800/60 border-2 border-dashed border-slate-600 rounded-3xl flex items-center justify-center mb-6">
              <ImageIcon size={36} className="text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No memories yet</h3>
            <p className="text-slate-500 text-sm max-w-xs mb-8">Be the first to share a moment from GOC!</p>
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-all active:scale-95">
              <Upload size={17} /> Share First Memory
            </button>
          </div>
        ) : (
          <>
            <div className="gallery-grid">
              {photos.map((photo, idx) => (
                <div
                  key={photo._id}
                  className="relative group aspect-square overflow-hidden rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-slate-500/50 transition-all duration-200 cursor-pointer"
                  onClick={() => setLightboxIdx(idx)}
                >
                  {/* Use Cloudinary thumbnail URL — served from CDN, tiny & fast */}
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt={photo.uploaderName || 'GOC memory'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-between p-3">
                    <div />
                    <div className="flex items-end justify-between">
                      <div>
                        {photo.uploaderName && photo.uploaderName !== 'Anonymous' && (
                          <p className="text-xs text-white/80 font-medium truncate max-w-[90px]">{photo.uploaderName}</p>
                        )}
                        <p className="text-[10px] text-white/50">
                          {new Date(photo.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-white/60 text-[10px]">
                        <ChevronLeft size={12} /><ChevronRight size={12} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {page < pages && (
              <div className="flex justify-center mt-10">
                <button onClick={() => { const n = page + 1; setPage(n); fetchPhotos(n) }} disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 border border-slate-600/50 hover:border-slate-500 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  Load More Photos
                </button>
              </div>
            )}
            <p className="text-center text-xs text-slate-600 mt-8">{photos.length} of {total} photos · GOC Memories Gallery</p>
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      {isAdmin
        ? <AdminLayout adminName={adminName} adminEmail={adminEmail}>{Content}</AdminLayout>
        : <div className="min-h-screen bg-slate-950 pitch-bg text-slate-100"><PublicGalleryHeader />{Content}</div>
      }

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => fetchPhotos(1)} />}

      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNav={setLightboxIdx}
        />
      )}
    </>
  )
}
