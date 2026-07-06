import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import HistoryClient from './HistoryClient'

export default function HistoryPage() {
  const token = cookies().get('admin_token')?.value
  if (!token) redirect('/login')
  const admin = verifyToken(token)
  if (!admin) redirect('/login')
  return <HistoryClient adminName={admin.name} adminEmail={admin.email} />
}
