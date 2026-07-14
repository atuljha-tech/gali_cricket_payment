'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import Link from 'next/link'
import {
  Upload, X, Image as ImageIcon, Loader2,
  Camera, Star, Trophy, ArrowLeft,
  ChevronLeft, ChevronRight, Trash2
} from 'lucide-react'
import { uploadToCloudinary } from '@/lib/uploadImage'

interface Photo {
  _id: string
  url: string
  thumbnailUrl: string
  uploadedAt: string
  uploaderName?: string
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({
  photos, index, onClose, onNav, isAdmin, onDelete,
}: {
  photos: Photo[]
  index: number
  onClose: () => void
  onNav: (i: number) => void
  isAdmin: boolean
  onDelete: (id: string) => void
}) {
  const photo   = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1
  const [deleting,   setDeleting]   = useState(false)
  const [isVisible,  setIsVisible]  = useState(false)
  const [imgSrc,     setImgSrc]     = useState(photo.thumbnailUrl || photo.url)
  const touchStartX = useRef(0)

  // Appear animation
  useEffect(() => { setIsVisible(true) }, [])

  // Swap to full image when ready
  useEffect(() => {
    setImgSrc(photo.thumbnailUrl || photo.url)
    if (photo.url) {
      const img = new window.Image()
      img.onload = () => setImgSrc(photo.url)
      img.src = photo.url
    }
  }, [photo._id, photo.url, photo.thumbnailUrl])

  // Keyboard — defined with useCallback so the effect dep is stable
  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      handleClose()
      if (e.key === 'ArrowLeft'  && hasPrev) onNav(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onNav(index + 1)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [handleClose, hasPrev, hasNext, index, onNav])

  const handleDelete = async () => {
    if (deleting) return
    if (!confirm('Delete this photo? This cannot be undone.')) return
    setDeleting(true)
    await onDelete(photo._id)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.96)' }}
      onClick={handleClose}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const diff = touchStartX.current - e.changedTouches[0].clientX
        if (diff > 50  && hasNext) onNav(index + 1)
        if (diff < -50 && hasPrev) onNav(index - 1)
      }}
    >
      {/* Close */}
      <button onClick={handleClose}
        className="absolute top-6 right-6 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
        <X size={24} />
      </button>

      {/* Counter */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-sm text-white/70 bg-black/50 px-4 py-1.5 rounded-full">
        {index + 1} / {photos.length}
      </div>

      {/* Prev */}
      {hasPrev && (
        <button onClick={e => { e.stopPropagation(); onNav(index - 1) }}
          className="absolute left-4 md:left-8 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all active:scale-95">
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Image */}
      <div className={`transition-transform duration-200 ${isVisible ? 'scale-100' : 'scale-95'}`}>
        <img src={imgSrc} alt={photo.uploaderName || 'GOC memory'}
          className="max-w-[92vw] max-h-[80vh] object-contain rounded-xl shadow-2xl select-none"
          onClick={e => e.stopPropagation()} draggable={false} />
      </div>

      {/* Next */}
      {hasNext && (
        <button onClick={e => { e.stopPropagation(); onNav(index + 1) }}
          className="absolute right-4 md:right-8 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all active:scale-95">
          <ChevronRight size={28} />
        </button>
      )}

      {/* Caption + delete */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3 flex-wrap justify-center">
        {photo.uploaderName && photo.uploaderName !== 'Anonymous' && (
          <div className="text-sm text-white/70 bg-black/50 px-4 py-2 rounded-full">
            📸 {photo.uploaderName} · {new Date(photo.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
        {isAdmin && (
          <button onClick={e => { e.stopPropagation(); handleDelete() }} disabled={deleting}
            className="text-sm text-white bg-red-600 hover:bg-red-500 px-5 py-2 rounded-full flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [previews,     setPreviews]     = useState<{ file: File; objectUrl: string }[]>([])
  const [uploaderName, setUploaderName] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [done,         setDone]         = useState(0)
  const [currentPct,   setCurrentPct]   = useState(0)
  const [error,        setError]        = useState('')
  const [dragOver,     setDragOver]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (arr.length < Array.from(files).length) setError('Non-image files skipped')
    setPreviews(prev => {
      const newOnes = arr.filter(f => !prev.some(p => p.file.name === f.name && p.file.size === f.size))
      return [...prev, ...newOnes.map(f => ({ file: f, objectUrl: URL.createObjectURL(f) }))]
    })
  }

  function removePreview(idx: number) {
    setPreviews(prev => { URL.revokeObjectURL(prev[idx].objectUrl); return prev.filter((_, i) => i !== idx) })
  }

  async function handleUpload() {
    if (!previews.length) return
    setLoading(true); setError(''); setDone(0); setCurrentPct(0)
    const name   = uploaderName.trim() || 'Anonymous'
    const errors: string[] = []

    for (let i = 0; i < previews.length; i++) {
      setCurrentPct(0)
      try {
        // Upload directly from browser → Cloudinary (no server body-size limit)
        const uploaded = await uploadToCloudinary(previews[i].file, 'gallery', setCurrentPct)
        const res = await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl:     uploaded.url,
            thumbnailUrl: uploaded.thumbnailUrl,
            publicId:     uploaded.publicId,
            uploaderName: name,
          }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error((d as {error?: string}).error || `Upload failed (${res.status})`)
        }
      } catch (err: unknown) {
        errors.push(`Photo ${i + 1}: ${err instanceof Error ? err.message : 'Failed'}`)
      }
      setDone(i + 1)
    }

    setLoading(false)
    if (errors.length > 0) {
      setError(`Some uploads failed: ${errors.join(' | ')}`)
    } else {
      onSuccess(); onClose()
    }
  }

  const progress = previews.length ? Math.round(((done + currentPct / 100) / previews.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-green-400" />
            <h2 className="font-bold text-white">Add to GOC Memories</h2>
            {previews.length > 0 && (
              <span className="text-xs bg-green-600/20 text-green-400 border border-green-600/30 px-2 py-0.5 rounded-full">{previews.length} selected</span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-2xl transition-all cursor-pointer p-8 ${dragOver ? 'border-green-500 bg-green-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && addFiles(e.target.files)} />
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-slate-700/60 rounded-2xl flex items-center justify-center"><Upload size={22} className="text-slate-400" /></div>
              <div>
                <p className="text-sm font-semibold text-slate-300">Drop photos here or click to browse</p>
                <p className="text-xs text-slate-500 mt-1">JPG · PNG · WEBP · upload as many as you want!</p>
              </div>
              {previews.length > 0 && <p className="text-xs text-green-400 font-semibold">Click to add more</p>}
            </div>
          </div>

          {/* Thumbnails */}
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

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Your Name (optional)</label>
            <input className="bg-slate-900/80 border border-slate-600/60 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 w-full focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-sm"
              placeholder="e.g. Rahul Kumar" value={uploaderName} onChange={e => setUploaderName(e.target.value)} />
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
            {loading ? <><Loader2 size={15} className="animate-spin" /> {progress}%</> : <><Upload size={15} /> Upload {previews.length > 0 ? `${previews.length} ` : ''}Photo{previews.length !== 1 ? 's' : ''}</>}
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GalleryClient() {
  const [photos,      setPhotos]      = useState<Photo[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [adminName,   setAdminName]   = useState<string | undefined>()
  const [adminEmail,  setAdminEmail]  = useState<string | undefined>()
  const [showUpload,  setShowUpload]  = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [page,        setPage]        = useState(1)
  const [pages,       setPages]       = useState(1)
  const [total,       setTotal]       = useState(0)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPhotos = useCallback(async (p = 1) => {
    if (p === 1) setLoading(true); else setLoadingMore(true)
    try {
      const res  = await fetch(`/api/gallery?page=${p}`)
      const data = await res.json()
      if (!data.error) {
        setPhotos(prev => p === 1 ? (data.photos || []) : [...prev, ...(data.photos || [])])
        setTotal(data.total  || 0)
        setPages(data.pages  || 1)
      }
    } finally {
      if (p === 1) setLoading(false); else setLoadingMore(false)
    }
  }, [])

  // Admin check + initial load — parallel
  useEffect(() => {
    fetchPhotos(1)
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.admin) { setIsAdmin(true); setAdminName(d.admin.name); setAdminEmail(d.admin.email) } })
      .catch(() => {})
  }, [fetchPhotos])

  // IntersectionObserver infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && !loading) {
        setPage(prev => {
          if (prev < pages) { fetchPhotos(prev + 1); return prev + 1 }
          return prev
        })
      }
    }, { rootMargin: '400px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadingMore, loading, pages, fetchPhotos])

  const deletePhoto = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed') }
      setPhotos(prev => {
        const idx = prev.findIndex(p => p._id === id)
        if (lightboxIdx !== null && idx !== -1 && lightboxIdx >= idx) setLightboxIdx(l => l !== null ? Math.max(0, l - 1) : null)
        return prev.filter(p => p._id !== id)
      })
      setTotal(t => t - 1)
      if (photos.length <= 1) setLightboxIdx(null)
    } catch { /* silent */ }
    finally { setDeletingId(null) }
  }

  const Content = (
    <div className="min-h-screen">
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
                <span className="flex items-center gap-1.5"><Camera size={14} className="text-yellow-400" />{total} photo{total !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1.5"><Trophy size={14} className="text-yellow-400" />Gali Online Cricket</span>
              </div>
            </div>
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-bold rounded-xl shadow-xl shadow-yellow-900/30 transition-all active:scale-95 text-sm self-start md:self-auto">
              <Camera size={18} /> Add Your Memory
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {loading && photos.length === 0 ? (
          <div className="gallery-grid">{[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-slate-800/60 rounded-xl animate-pulse border border-slate-700/30" />)}</div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-slate-800/60 border-2 border-dashed border-slate-600 rounded-3xl flex items-center justify-center mb-6"><ImageIcon size={36} className="text-slate-500" /></div>
            <h3 className="text-xl font-bold text-white mb-2">No memories yet</h3>
            <p className="text-slate-500 text-sm max-w-xs mb-8">Be the first to share a moment from GOC!</p>
            <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-all active:scale-95">
              <Upload size={17} /> Share First Memory
            </button>
          </div>
        ) : (
          <>
            <div className="gallery-grid">
              {photos.map((photo, idx) => (
                <div key={photo._id}
                  className="relative group aspect-square overflow-hidden rounded-xl bg-slate-800/60 border border-slate-700/30 hover:border-slate-500/50 transition-all duration-200 cursor-pointer"
                  onClick={() => setLightboxIdx(idx)}>
                  <img src={photo.thumbnailUrl || photo.url} alt={photo.uploaderName || 'GOC memory'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy" decoding="async" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-between p-3">
                    <div className="flex justify-end">
                      {isAdmin && (
                        <button onClick={e => { e.stopPropagation(); deletePhoto(photo._id) }} disabled={deletingId === photo._id}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all">
                          {deletingId === photo._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      )}
                    </div>
                    <div>
                      {photo.uploaderName && photo.uploaderName !== 'Anonymous' && (
                        <p className="text-xs text-white/80 font-medium truncate">{photo.uploaderName}</p>
                      )}
                      <p className="text-[10px] text-white/50">{new Date(photo.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Invisible sentinel triggers next-page load */}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && <div className="flex justify-center py-4"><Loader2 size={22} className="animate-spin text-slate-500" /></div>}
            <p className="text-center text-xs text-slate-600 mt-2">{photos.length} of {total} photos · GOC Memories</p>
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
        <Lightbox photos={photos} index={lightboxIdx}
          onClose={() => setLightboxIdx(null)} onNav={setLightboxIdx}
          isAdmin={isAdmin} onDelete={deletePhoto} />
      )}
    </>
  )
}
