import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require admin authentication
const PROTECTED_ROUTES = ['/dashboard', '/players', '/matrix', '/history', '/settings']

/**
 * Edge-compatible JWT verification using Web Crypto API.
 * jsonwebtoken uses Node.js crypto which doesn't work in Edge runtime.
 */
async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) return false

    const parts = token.split('.')
    if (parts.length !== 3) return false

    const [headerB64, payloadB64, signatureB64] = parts

    // Import the secret key
    const keyData = new TextEncoder().encode(secret)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // The signing input is "header.payload"
    const signingInput = `${headerB64}.${payloadB64}`
    const signingInputBytes = new TextEncoder().encode(signingInput)

    // Decode the base64url signature
    const b64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=')
    const sigBytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, signingInputBytes)
    if (!valid) return false

    // Check expiry from payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      payloadB64.length + (4 - (payloadB64.length % 4)) % 4, '='
    ))
    const payload = JSON.parse(payloadJson)
    if (payload.exp && Date.now() / 1000 > payload.exp) return false

    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))

  if (isProtected) {
    const token = request.cookies.get('admin_token')?.value
    const valid = await isValidToken(token)
    if (!valid) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/players/:path*', '/matrix/:path*', '/history/:path*', '/settings/:path*'],
}
