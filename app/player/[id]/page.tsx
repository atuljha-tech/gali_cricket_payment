import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import PlayerDetailClient from './PlayerDetailClient'

export default function PlayerDetailPage({ params }: { params: { id: string } }) {
  const token = cookies().get('admin_token')?.value
  if (!token) redirect('/login')
  const admin = verifyToken(token)
  if (!admin) redirect('/login')
  return <PlayerDetailClient playerId={params.id} adminName={admin.name} />
}
