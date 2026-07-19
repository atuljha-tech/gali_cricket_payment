import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'

/**
 * Dashboard page has been removed and consolidated into the Stats page.
 * Redirect admins who land here to Players, which is the primary admin page.
 */
export default function DashboardPage() {
  const token = cookies().get('admin_token')?.value
  if (!token) redirect('/login')
  const admin = verifyToken(token)
  if (!admin) redirect('/login')
  redirect('/players')
}
