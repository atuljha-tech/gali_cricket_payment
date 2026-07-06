import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import DashboardClient from './DashboardClient'

export default function DashboardPage() {
  const token = cookies().get('admin_token')?.value
  if (!token) redirect('/login')
  const admin = verifyToken(token)
  if (!admin) redirect('/login')

  return <DashboardClient adminName={admin.name} adminEmail={admin.email} />
}
