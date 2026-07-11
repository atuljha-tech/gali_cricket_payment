import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import MatrixLazy from './MatrixLazy'

export default function MatrixPage() {
  const token = cookies().get('admin_token')?.value
  if (!token) redirect('/login')
  const admin = verifyToken(token)
  if (!admin) redirect('/login')
  return <MatrixLazy adminName={admin.name} adminEmail={admin.email} />
}
