'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, CheckCircle2, Trophy } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/fineCalculator'

interface Receipt {
  _id: string
  month: number
  year: number
  amount: number
  fine: number
  total: number
  status: string
  receiptNo: string
  paidAt: string
  playerId: { name: string; phone: string; email?: string }
  adminId?: { name: string }
}

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/payments/${params.id}`)
      .then(r => r.json())
      .then(d => { setReceipt(d.payment); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.id])

  async function handleDownloadPDF() {
    if (!receipt) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a5' })

    const green: [number, number, number] = [22, 101, 52]
    const greenLight: [number, number, number] = [34, 197, 94]
    const dark: [number, number, number] = [15, 23, 42]
    const gray: [number, number, number] = [100, 116, 139]
    const white: [number, number, number] = [255, 255, 255]

    // Header bg
    doc.setFillColor(...green)
    doc.rect(0, 0, 148, 38, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('GOC', 74, 14, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Monthly Fee Receipt · Gali Online Cricket', 74, 22, { align: 'center' })
    doc.setFillColor(...greenLight)
    doc.roundedRect(54, 28, 40, 8, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...white)
    doc.text('✓  PAID', 74, 34, { align: 'center' })

    doc.setTextColor(...gray)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(receipt.receiptNo, 74, 46, { align: 'center' })

    doc.setDrawColor(226, 232, 240)
    doc.line(15, 50, 133, 50)

    const rows: [string, string][] = [
      ['Player Name', receipt.playerId.name],
      ['Phone', receipt.playerId.phone],
      ['Period', `${MONTH_NAMES[receipt.month]} ${receipt.year}`],
      ['Payment Date', receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString('en-IN') : '—'],
      ['Confirmed By', receipt.adminId?.name || '—'],
    ]
    let y = 58
    for (const [l, v] of rows) {
      doc.setTextColor(...gray); doc.setFontSize(8); doc.text(l, 15, y)
      doc.setTextColor(...dark); doc.setFontSize(8.5); doc.text(v, 133, y, { align: 'right' })
      y += 7.5
    }
    doc.line(15, y, 133, y); y += 6
    doc.setTextColor(...gray); doc.text('Monthly Fee', 15, y)
    doc.setTextColor(...dark); doc.text(`₹${receipt.amount}`, 133, y, { align: 'right' })
    y += 7
    if (receipt.fine > 0) {
      doc.setTextColor(...gray); doc.text('Late Fine', 15, y)
      doc.setTextColor(239, 68, 68); doc.text(`+₹${receipt.fine}`, 133, y, { align: 'right' })
      y += 7
    }
    doc.setFillColor(241, 245, 249); doc.rect(12, y, 124, 10, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.setTextColor(...dark); doc.text('Total Paid', 15, y + 7)
    doc.setTextColor(...green); doc.text(`₹${receipt.total}`, 133, y + 7, { align: 'right' })
    y += 20
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray)
    doc.text('This receipt confirms payment received. GOC', 74, y, { align: 'center' })

    doc.save(`${receipt.receiptNo}.pdf`)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!receipt) return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <p className="text-slate-500">Receipt not found</p>
        <Link href="/" className="btn-primary inline-block">Go Home</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pitch-bg">
      {/* Top bar */}
      <header className="no-print bg-slate-900/95 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-600/50 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl text-sm transition-all">
              🖨 Print
            </button>
            <button onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-green-900/30">
              <Download size={14} /> PDF
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl" id="receipt-card">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-900 via-green-800 to-green-900 px-6 py-7 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(34,197,94,0.2),transparent_70%)]" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy size={18} className="text-green-300" />
                <span className="text-white font-black text-xl tracking-tight">GOC</span>
              </div>
              <p className="text-green-300/70 text-xs">Gali Online Cricket · Monthly Fee Receipt</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-green-500 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-lg">
                <CheckCircle2 size={14} /> PAID
              </div>
            </div>
          </div>

          {/* Receipt no */}
          <div className="bg-slate-900/60 px-6 py-2.5 text-center border-b border-slate-700/40">
            <p className="text-xs text-slate-500 font-mono tracking-widest">{receipt.receiptNo}</p>
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-3">
              {[
                { label: 'Player Name', value: receipt.playerId.name },
                { label: 'Phone', value: receipt.playerId.phone },
                { label: 'Period', value: `${MONTH_NAMES[receipt.month]} ${receipt.year}` },
                { label: 'Payment Date', value: receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                { label: 'Verified By', value: receipt.adminId?.name || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-700/30 last:border-0">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-white font-semibold">{value}</span>
                </div>
              ))}
            </div>

            {/* Amount breakdown */}
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Monthly Fee</span>
                <span className="text-slate-200">₹{receipt.amount}</span>
              </div>
              {receipt.fine > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Late Fine</span>
                  <span className="text-red-400 font-medium">+₹{receipt.fine}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                <span className="text-base font-bold text-white">Total Paid</span>
                <span className="text-2xl font-black text-green-400">₹{receipt.total}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-900/40 border-t border-slate-700/40 text-center">
            <p className="text-xs text-slate-600">
              This receipt confirms ₹{receipt.total} received for {MONTH_NAMES[receipt.month]} {receipt.year}.
            </p>
            <p className="text-xs text-slate-700 mt-0.5">Payment verified manually by admin · GOC</p>
          </div>
        </div>
      </div>
    </div>
  )
}
