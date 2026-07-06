import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/mongodb'
import Admin from '@/models/Admin'
import { signToken } from '@/lib/auth'
import { PREDEFINED_ADMINS } from '@/lib/adminConfig'

export const dynamic = 'force-dynamic'

const ALLOWED_EMAILS = PREDEFINED_ADMINS.map((admin) => admin.email)

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalised = email.toLowerCase().trim()

    // Hard-block any email not in the approved list
    if (!ALLOWED_EMAILS.includes(normalised)) {
      return NextResponse.json({ error: 'Access denied. Unauthorised email.' }, { status: 403 })
    }

    await dbConnect()
    const admin = await Admin.findOne({ email: normalised })

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin account not found. Please run /api/seed first.' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const token = signToken({
      id:    admin._id.toString(),
      name:  admin.name,
      email: admin.email,
      role:  admin.role,  // 'admin' | 'superadmin'
    })

    const response = NextResponse.json({
      message: 'Login successful',
      admin: { id: admin._id, name: admin.name, email: admin.email },
    })

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,   // 7 days
      path:     '/',
    })

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
