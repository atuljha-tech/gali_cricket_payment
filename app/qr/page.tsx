'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, QrCode, Copy, Check, Shield } from 'lucide-react'

interface Settings { monthlyFee: number; dailyFine: number; dueDate: number; qrImage: string; upiId: string }

export default function QRPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => { setSettings(d.settings); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function copyUpi() {
    if (!settings?.upiId) return
    await navigator.clipboard.writeText(settings.upiId)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pitch-bg">
      <header className="bg-slate-900/95 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-700/60 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <QrCode size={16} className="text-green-400" />
            <span className="font-bold text-sm text-white">Pay via QR Code</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {loading ? (
          <div className="card p-8 flex justify-center animate-pulse">
            <div className="w-52 h-52 bg-slate-700 rounded-xl" />
          </div>
        ) : (
          <>
            {/* QR Card */}
            <div className="relative overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-green-900 to-slate-900" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,197,94,0.15),transparent_70%)]" />
              <div className="relative z-10 p-6 flex flex-col items-center gap-5">
                {settings?.qrImage ? (
                  <div className="p-3 bg-white rounded-2xl shadow-2xl shadow-black/50">
                    <img src={settings.qrImage} alt="Google Pay QR Code" className="w-52 h-52 object-contain" />
                  </div>
                ) : (
                  <div className="w-52 h-52 bg-slate-800/80 border-2 border-dashed border-slate-600 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <QrCode size={48} className="text-slate-600" />
                    <p className="text-xs text-slate-500 text-center px-4">QR not set yet.<br />Admin can upload from Settings.</p>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-4xl font-black text-white">₹{settings?.monthlyFee ?? 20}</p>
                  <p className="text-xs text-green-400 font-semibold uppercase tracking-widest mt-1">Monthly Cricket Fee</p>
                </div>

                {settings?.upiId && (
                  <button
                    onClick={copyUpi}
                    className="flex items-center gap-3 bg-slate-800/80 border border-slate-600/50 hover:border-green-600/50 px-4 py-2.5 rounded-xl w-full max-w-xs transition-all"
                  >
                    <p className="flex-1 text-sm text-slate-300 font-mono truncate text-left">{settings.upiId}</p>
                    {copied
                      ? <Check size={15} className="text-green-400 flex-shrink-0" />
                      : <Copy size={15} className="text-slate-500 flex-shrink-0" />}
                  </button>
                )}
              </div>
            </div>

            {/* How to pay */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-bold text-white">How to Pay</h2>
              <ol className="space-y-3">
                {[
                  'Open Google Pay, PhonePe, or any UPI app',
                  'Tap "Scan QR" and scan the code above',
                  `Pay ₹${settings?.monthlyFee ?? 20} — the monthly cricket fee`,
                  'Take a screenshot of the confirmation',
                  'Tell the admin — they will mark you as Paid',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-slate-300">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Fine warning */}
            {(settings?.dailyFine ?? 0) > 0 && (
              <div className="flex items-start gap-3 bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-4 py-3.5">
                <Shield size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-300">Late Payment Fine</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    A fine of ₹{settings?.dailyFine}/day applies after the {settings?.dueDate}th of each month.
                  </p>
                </div>
              </div>
            )}

            <Link href="/"
              className="flex items-center justify-center gap-2 py-3 border border-slate-600/50 hover:border-slate-500 rounded-xl text-sm text-slate-400 hover:text-white transition-all">
              <ArrowLeft size={14} /> Back to Player List
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
