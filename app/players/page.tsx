import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import PlayersClient from './PlayersClient'

export default function PlayersPage() {
  const token = cookies().get('admin_token')?.value
  if (!token) redirect('/login')
  const admin = verifyToken(token)
  if (!admin) redirect('/login')
  return <PlayersClient adminName={admin.name} adminId={admin.id} adminEmail={admin.email} />
}
