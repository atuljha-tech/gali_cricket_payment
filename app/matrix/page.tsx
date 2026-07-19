import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'

/**
 * Matrix page has been removed from admin navigation.
 * Redirect to Players page.
 */
export default function MatrixPage() {
  const token = cookies().get('admin_token')?.value
  if (!token) redirect('/login')
  const admin = verifyToken(token)
  if (!admin) redirect('/login')
  redirect('/players')
}
