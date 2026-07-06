import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out' })
  response.cookies.set('admin_token', '', { maxAge: 0, path: '/' })
  return response
}
