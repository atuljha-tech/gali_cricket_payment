import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import SettingsClient from './SettingsClient'

export default function SettingsPage() {
  const token = cookies().get('admin_token')?.value
  if (!token) redirect('/login')
  const admin = verifyToken(token)
  if (!admin) redirect('/login')
  return <SettingsClient adminName={admin.name} adminEmail={admin.email} />
}
