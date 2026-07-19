'use client'
import { useEffect, useState, useRef } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Save, Upload, Loader2, CheckCircle2, QrCode, IndianRupee, AlertCircle } from 'lucide-react'

interface Settings {
  monthlyFee: number
  dueDate: number
  qrImage: string
  upiId: string
}

export default function SettingsClient({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  // Helper to convert File to base64 data URL
  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const isSuperAdmin = adminEmail === 'rishigoc@mail.com'
  const [settings, setSettings] = useState<Settings>({ monthlyFee: 30, dueDate: 31, qrImage: '', upiId: '' })
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [saved,   setSaved]     = useState(false)
  const [error,   setError]     = useState('')
  const [uploadingQr, setUploadingQr] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { setSettings(d.settings); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed') }
      else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } catch { setError('Network error') }
    finally { setSaving(false) }
  }

  async function handleQRUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setUploadingQr(true)
    try {
      const base64Data = await fileToBase64(file)
      setSettings(s => ({ ...s, qrImage: base64Data }))
    } catch (err: any) {
      setError(err.message || 'Could not upload QR image')
    } finally {
      setUploadingQr(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) return (
    <AdminLayout adminName={adminName} adminEmail={adminEmail}>
      <div className="max-w-2xl space-y-4 animate-pulse">
        <div className="h-8 bg-slate-700 rounded-xl w-1/3" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card p-6 space-y-4">
            {[...Array(2)].map((_, j) => <div key={j} className="h-11 bg-slate-700 rounded-xl" />)}
          </div>
        ))}
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout adminName={adminName} adminEmail={adminEmail}>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="section-title">Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configure monthly fee and payment details</p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Fee config — no fine */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-1">
              <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center">
                <IndianRupee size={15} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Fee Configuration</h2>
                <p className="text-xs text-slate-500">Monthly subscription fee — no fines</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="label">Monthly Fee (₹)</label>
                <input type="number" min="1" className="input-field"
                  value={settings.monthlyFee}
                  onChange={e => setSettings({ ...settings, monthlyFee: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <label className="label">Due Date (day of month)</label>
                <input type="number" min="1" max="31" className="input-field"
                  value={settings.dueDate}
                  onChange={e => setSettings({ ...settings, dueDate: Number(e.target.value) })} />
                <p className="text-[11px] text-slate-500">Fee is due by this day each month (e.g. 31 = last day)</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-300 mb-2">Example allocations</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { paid: settings.monthlyFee,     result: '1 month paid' },
                  { paid: settings.monthlyFee * 2, result: '2 months paid' },
                  { paid: settings.monthlyFee + 10, result: `1 month + ₹10 credit` },
                  { paid: Math.floor(settings.monthlyFee / 2), result: `Partial (₹${settings.monthlyFee - Math.floor(settings.monthlyFee / 2)} due)` },
                ].map((ex, i) => (
                  <div key={i} className="bg-slate-800/60 rounded-lg py-2 px-3">
                    <p className="text-slate-400">₹{ex.paid} →</p>
                    <p className="text-white font-semibold mt-0.5">{ex.result}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QR & UPI — Rishi only */}
          {isSuperAdmin && (
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-1">
                <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                  <QrCode size={15} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Payment QR & UPI</h2>
                  <p className="text-xs text-slate-500">Google Pay QR code and UPI ID (Rishi only)</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label">UPI ID</label>
                <input type="text" className="input-field font-mono text-sm"
                  placeholder="yourname@upi or 9876543210@ybl"
                  value={settings.upiId}
                  onChange={e => setSettings({ ...settings, upiId: e.target.value })} />
              </div>
              <div className="space-y-3">
                <label className="label">QR Code Image</label>
                <div className="flex items-start gap-4">
                  {settings.qrImage ? (
                    <div className="relative flex-shrink-0">
                      <img src={settings.qrImage} alt="QR Code" className="w-24 h-24 object-contain border border-slate-600 rounded-xl bg-white p-1.5" />
                      <button type="button" onClick={() => setSettings(s => ({ ...s, qrImage: '' }))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-500">×</button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed border-slate-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      {uploadingQr ? <Loader2 size={22} className="text-slate-500 animate-spin" /> : <QrCode size={26} className="text-slate-600" />}
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleQRUpload} disabled={uploadingQr} />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingQr}
                      className="flex items-center gap-2 px-4 py-2.5 border border-slate-600/60 hover:border-green-600/50 hover:text-green-400 rounded-xl text-sm text-slate-300 transition-all disabled:opacity-50">
                      {uploadingQr ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                      {uploadingQr ? 'Uploading...' : settings.qrImage ? 'Replace QR Image' : 'Upload QR Image'}
                    </button>
                    <p className="text-xs text-slate-500">Upload your Google Pay / UPI QR code. PNG or JPG, max 15MB.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="card p-5 flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <QrCode size={15} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Payment QR &amp; UPI</p>
                <p className="text-xs text-slate-400 mt-0.5">Managed by <span className="text-green-400 font-semibold">Rishi</span>.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} /> {error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 size={15} /> Settings saved!
            </div>
          )}
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-7 py-3 text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </AdminLayout>
  )
}
