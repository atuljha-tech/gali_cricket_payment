import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import GalleryClient from './GalleryClient'

export default function GalleryPage() {
  // Gallery is accessible to everyone (logged-in admins get delete button)
  const token = cookies().get('admin_token')?.value
  const admin = token ? verifyToken(token) : null
  return <GalleryClient isAdmin={!!admin} adminName={admin?.name} adminEmail={admin?.email} />
}
