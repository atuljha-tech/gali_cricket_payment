'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import Link from 'next/link'
import {
  Upload, X, Image as ImageIcon, Loader2,
  Camera, Star, Trophy, ArrowLeft, Trash2, ZoomIn
} from 'lucide-react'

interface Photo {
  _id: string
  imageData: string      // full quality — only loaded in lightbox
  thumbnail?: string     // small ~300px version for grid
  uploadedAt: string
  uploaderName?: string
}

// ── Compress an image file via canvas ────────────────────────────────────────
// Returns a base64 data URL at the given max dimension and quality.
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
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all z-10"
      >
        <X size={18} />
      </button>
      <img
        src={photo.imageData}
        alt="Gallery photo"
        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

// ── Multi-Upload Modal ────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [previews, setPreviews]     = useState<{ file: File; dataUrl: string }[]>([])
  const [uploaderName, setUploaderName] = useState('')
  const [loading, setLoading]       = useState(false)
  const [progress, setProgress]     = useState(0)   // 0-100 across all photos
  const [done, setDone]             = useState(0)    // count finished
  const [error, setError]           = useState('')
  const [dragOver, setDragOver]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function processFiles(files: FileList | File[]) {
    const arr = Array.from(files)
    const tooLarge = arr.filter(f => f.size > 10 * 1024 * 1024) // 10MB hard limit before compress
    if (tooLarge.length) setError(`${tooLarge.length} file(s) skipped — original must be under 10MB`)
    else setError('')

    const valid = arr.filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024)

    // Use createObjectURL for instant previews — no FileReader loop
    valid.forEach(file => {
      const thumbUrl = URL.createObjectURL(file)
      setPreviews(prev => {
        if (prev.some(p => p.file.name === file.name && p.file.size === file.size)) return prev
        return [...prev, { file, dataUrl: thumbUrl }]
      })
    })
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(e.target.files)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files)
  }
  function removePreview(idx: number) {
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx].dataUrl) // free memory
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function handleUpload() {
    if (previews.length === 0) return
    setLoading(true); setError(''); setProgress(0); setDone(0)
    const name = uploaderName.trim() || 'Anonymous'
    const total = previews.length
    let completed = 0

    // Compress ALL photos in parallel first (canvas is fast)
    const compressed = await Promise.all(
      previews.map(item => compressImage(item.file, 1200, 0.75))
    )

    // Upload in parallel batches of 5 to avoid overwhelming the server
    const BATCH = 5
    for (let i = 0; i < compressed.length; i += BATCH) {
      const batch = compressed.slice(i, i + BATCH)
      await Promise.all(
        batch.map(async (imageData) => {
          try {
            const res = await fetch('/api/gallery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageData, uploaderName: name }),
            })
            if (!res.ok) setError('Some uploads failed — check connection')
          } catch {
            setError('Upload failed for one or more photos.')
          } finally {
            completed++
            setDone(completed)
            setProgress(Math.round((completed / total) * 100))
          }
        })
      )
    }

    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        className="w-full max-w-2xl bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-green-400" />
            <h2 className="font-bold text-white">Add to GOC Memories</h2>
            {previews.length > 0 && (
              <span className="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-2 py-0.5 rounded-full font-semibold">
                {previews.length} photo{previews.length !== 1 ? 's' : ''} selected
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
            className={`border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer p-8 ${
              dragOver ? 'border-green-500 bg-green-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInputChange} />
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-slate-700/60 rounded-2xl flex items-center justify-center">
                <Upload size={22} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">Drop photos here or click to browse</p>
                <p className="text-xs text-slate-500 mt-1">Select up to 20 photos · JPG, PNG, WEBP · Max 10MB each</p>
              </div>
              {previews.length > 0 && (
                <p className="text-xs text-green-400 font-semibold">Click to add more</p>
              )}
            </div>
          </div>

          {/* Preview grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {previews.map((item, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-700/40 group">
                  <img src={item.dataUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePreview(idx)}
                    className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Your Name (optional)</label>
            <input
              className="bg-slate-900/80 border border-slate-600/60 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
              placeholder="e.g. Rahul Kumar"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
            />
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading {done}/{previews.length} photos...</span>
                <span className="font-semibold text-green-400">{progress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5 pt-3 border-t border-slate-700/40 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-xl text-sm font-medium transition-all">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={previews.length === 0 || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-green-900/30"
          >
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
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
      </div>
    </header>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GalleryClient({ isAdmin, adminName, adminEmail }: { isAdmin: boolean; adminName?: string; adminEmail?: string }) {
  const [photos, setPhotos]     = useState<Photo[]>([])
  const [loading, setLoading]   = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [page, setPage]         = useState(1)
  const [pages, setPages]       = useState(1)
  const [total, setTotal]       = useState(0)

  const fetchPhotos = useCallback(async (p = 1) => {
    if (p === 1) setLoading(true)
    try {
      const res = await fetch(`/api/gallery?page=${p}&limit=24`)
      const data = await res.json()
      setPhotos(prev => p === 1 ? (data.photos || []) : [...prev, ...(data.photos || [])])
      setTotal(data.total || 0)
      setPages(data.pages || 1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPhotos(1) }, [fetchPhotos])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/gallery/${id}`, { method: 'DELETE' })
      setPhotos(prev => prev.filter(p => p._id !== id))
      setTotal(t => t - 1)
    } finally {
      setDeleting(null)
    }
  }

  function loadMore() {
    const next = page + 1
    setPage(next)
    fetchPhotos(next)
  }

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
                Captured moments from the pitch. Every match, every celebration, every memory.
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><Camera size={14} className="text-yellow-400" />{total} photo{total !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1.5"><Trophy size={14} className="text-yellow-400" />Gali Online Cricket</span>
              </div>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-bold rounded-xl shadow-xl shadow-yellow-900/30 transition-all duration-200 active:scale-95 text-sm self-start md:self-auto"
            >
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
              {photos.map((photo) => (
                <div
                  key={photo._id}
                  className="relative group aspect-square overflow-hidden rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-slate-500/50 transition-all duration-200 cursor-pointer"
                  onClick={() => setLightbox(photo)}
                >
                  {/* Use thumbnail for grid — much smaller payload */}
                  <img
                    src={photo.thumbnail || photo.imageData}
                    alt="GOC memory"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-between p-3">
                    <div className="flex justify-end">
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(photo._id) }}
                          disabled={deleting === photo._id}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-all"
                        >
                          {deleting === photo._id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        {photo.uploaderName && photo.uploaderName !== 'Anonymous' && (
                          <p className="text-xs text-white/80 font-medium truncate max-w-[80px]">{photo.uploaderName}</p>
                        )}
                        <p className="text-[10px] text-white/50">
                          {new Date(photo.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 text-white">
                        <ZoomIn size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {page < pages && (
              <div className="flex justify-center mt-10">
                <button onClick={loadMore} disabled={loading}
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
      {isAdmin ? (
        <AdminLayout adminName={adminName} adminEmail={adminEmail}>{Content}</AdminLayout>
      ) : (
        <div className="min-h-screen bg-slate-950 pitch-bg text-slate-100">
          <PublicGalleryHeader />{Content}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => fetchPhotos(1)} />}
      {lightbox && <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}
