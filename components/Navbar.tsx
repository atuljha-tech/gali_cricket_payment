'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Users, History, Settings, LogOut,
  Menu, X, QrCode, Images, ChevronRight, Wallet, BarChart3
} from 'lucide-react'

// Dashboard and Matrix removed per requirements
const navItems = [
  { href: '/players',      label: 'Players',         icon: Users },
  { href: '/history',      label: 'Payment History', icon: History },
  { href: '/fund',         label: 'Fund Spending',   icon: Wallet },
  { href: '/fund-income',  label: 'Fund Income',     icon: BarChart3 },
  { href: '/gallery',      label: 'GOC Memories',    icon: Images },
  { href: '/settings',     label: 'Settings',        icon: Settings },
]

const publicItems = [
  { href: '/stats', label: 'Public Stats', icon: BarChart3 },
  { href: '/qr',    label: 'QR Payment',   icon: QrCode },
]

export default function Navbar({ adminName, adminEmail }: { adminName?: string; adminEmail?: string }) {
  const isSuperAdmin = adminEmail === 'rishigoc@mail.com'
  const pathname = usePathname()
  const router   = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onEsc)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onEsc) }
  }, [mobileOpen])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function close() { setMobileOpen(false) }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-slate-950/70 border-r border-white/10 fixed left-0 top-0 z-30 backdrop-blur-2xl">
        <div className="px-5 py-5 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-lg shadow-purple-900/40 border border-purple-700/30">
              <Image src="/goc-logo.png" alt="GOC Logo" width={48} height={48} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight gradient-text">G.O.C</h1>
              <p className="text-[10px] text-green-400 font-medium uppercase tracking-widest">Cricket Manager</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Menu</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link key={href} href={href} className={active ? 'nav-link-active' : 'nav-link'}>
                <Icon size={17} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={13} className="opacity-60" />}
              </Link>
            )
          })}
          <div className="pt-3">
            <p className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Public</p>
            {publicItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={pathname === href ? 'nav-link-active' : 'nav-link'}>
                <Icon size={17} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {pathname === href && <ChevronRight size={13} className="opacity-60" />}
              </Link>
            ))}
          </div>
        </nav>

        <div className="px-3 pb-4 border-t border-slate-700/50 pt-3 flex-shrink-0">
          {adminName && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-700/30 mb-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {adminName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{adminName}</p>
                <p className="text-[10px] text-slate-500">{isSuperAdmin ? 'Superadmin · Payments' : 'Admin'}</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all duration-200">
            <LogOut size={17} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900/95 border-b border-slate-700/50 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-purple-700/30 flex-shrink-0">
              <Image src="/goc-logo.png" alt="GOC" width={32} height={32} className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-black text-white">G.O.C</span>
          </div>
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-700/60 text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/70" onClick={close} />
          <div
            id="mobile-nav-drawer"
            className="md:hidden fixed left-0 right-0 top-14 bottom-0 z-50 bg-slate-900 border-t border-slate-700/50 flex flex-col overflow-hidden max-h-[calc(100dvh-3.5rem)]"
          >
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <nav className="px-3 pt-4 pb-2 space-y-1">
                <p className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Menu</p>
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active = pathname.startsWith(href)
                  return (
                    <Link key={href} href={href} onClick={close}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all ${
                        active
                          ? 'bg-green-600 text-white shadow-lg shadow-green-900/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/60 active:bg-slate-700'
                      }`}>
                      <Icon size={20} className="flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {active && <ChevronRight size={14} className="opacity-60" />}
                    </Link>
                  )
                })}

                <div className="pt-2">
                  <p className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Public</p>
                  {publicItems.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} onClick={close}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all ${
                        pathname === href
                          ? 'bg-green-600 text-white shadow-lg shadow-green-900/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/60 active:bg-slate-700'
                      }`}>
                      <Icon size={20} className="flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {pathname === href && <ChevronRight size={14} className="opacity-60" />}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>

            <div className="flex-shrink-0 border-t border-slate-700/50 px-3 py-3 bg-slate-900">
              {adminName && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-700/40 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {adminName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{adminName}</p>
                    <p className="text-xs text-slate-500">{isSuperAdmin ? 'Superadmin · Payments' : 'Admin'}</p>
                  </div>
                </div>
              )}
              <button onClick={() => { close(); handleLogout() }}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all">
                <LogOut size={20} /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
