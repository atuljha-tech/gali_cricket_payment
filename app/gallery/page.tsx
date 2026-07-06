// Pure static shell — no server-side work, no DB calls, no cookie reads.
// Admin detection happens client-side via /api/auth/me so the page
// renders the skeleton immediately and loads data in parallel.
import GalleryClient from './GalleryClient'

export default function GalleryPage() {
  return <GalleryClient />
}
