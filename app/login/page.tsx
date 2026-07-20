'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, ShieldCheck, Trophy, Zap, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Load saved credentials from localStorage on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('goc_admin_email')
    const savedPassword = localStorage.getItem('goc_admin_password')
    if (savedEmail) setEmail(savedEmail)
    if (savedPassword) setPassword(savedPassword)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
      } else {
        // Save credentials to localStorage after successful login
        localStorage.setItem('goc_admin_email', email)
        localStorage.setItem('goc_admin_password', password)
        router.push('/players')
        router.refresh()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex overflow-hidden">

      {/* ── Left hero panel ────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(22,101,52,0.4),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(34,197,94,0.08),transparent_60%)]" />
        <div className="absolute inset-0 pitch-bg opacity-40" />

        {/* Decorative pitch arcs */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] border-t-2 border-green-500/10 rounded-t-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[380px] h-[190px] border-t-2 border-green-500/10 rounded-t-full" />

        {/* Glow orbs */}
        <div className="absolute top-20 right-20 w-36 h-36 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-16 w-52 h-52 bg-emerald-500/8 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-md w-full">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/60 border-2 border-purple-600/30">
              <Image src="/goc-logo.png" alt="GOC Logo" width={80} height={80} className="w-full h-full object-cover" />
            </div>
          </div>

          <h1 className="text-6xl font-black mb-3 tracking-tight gradient-text drop-shadow-[0_0_25px_rgba(34,197,94,0.4)]">
            GOC
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Manage your cricket club, players,<br />and monthly collections effortlessly.
          </p>

          {/* Feature pills */}
          <div className="space-y-3 mb-10">
            {[
              { icon: ShieldCheck, text: 'Restricted to 5 authorised admins only' },
              { icon: Trophy,      text: 'Track payments & generate receipts' },
              { icon: Zap,         text: 'Flexible payment allocation across months' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                <Icon size={15} className="text-green-400 flex-shrink-0" />
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={13} className="text-yellow-400" />
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Protected Access</p>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Only the predefined GOC administrator accounts can sign in to manage payments and records.
            </p>
          </div>
        </div>

        <div className="absolute bottom-6 text-xs text-slate-700">
          Gali Online Cricket · Gods of Cricket
        </div>
      </div>

      {/* ── Right: login form ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-purple-600/30 shadow-xl shadow-purple-900/40 mb-3">
              <Image src="/goc-logo.png" alt="GOC" width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-black text-white">G<span className="text-green-400">O</span>C</h1>
            <p className="text-slate-500 text-sm mt-1">GOC Admin Portal</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Admin Sign In</h2>
            <p className="text-slate-400 mt-1 text-sm">
              Access restricted to authorised members only
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                className="w-full bg-slate-900/80 border border-slate-600/60 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="w-full bg-slate-900/80 border border-slate-600/60 text-slate-100 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0 mt-1.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/30 active:scale-95 text-sm mt-2"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                : <><ShieldCheck size={16} /> Sign In to Dashboard</>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-8">
            Not an admin?{' '}
            <a href="/" className="text-green-400 hover:text-green-300 transition-colors">
              View public page →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
