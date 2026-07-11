'use client'
import { useState } from 'react'
import Modal from './Modal'
import { Loader2, Crown, Save, AlertCircle } from 'lucide-react'
import { PLAYER_ROLES, BATTING_STYLES, BOWLING_ARMS, BOWLING_TYPES } from '@/lib/playerMeta'

export interface ProfileEditData {
  _id: string
  name: string
  role?: string
  battingStyle?: string
  bowlingArm?: string
  bowlingType?: string
  jerseyNumber?: number
  isCaptain?: boolean
}

export default function PlayerProfileEditModal({
  player, onClose, onSaved,
}: {
  player: ProfileEditData
  onClose: () => void
  onSaved: () => void
}) {
  const [role, setRole] = useState(player.role || '')
  const [battingStyle, setBattingStyle] = useState(player.battingStyle || '')
  const [bowlingArm, setBowlingArm] = useState(player.bowlingArm || '')
  const [bowlingType, setBowlingType] = useState(player.bowlingType || '')
  const [jerseyNumber, setJerseyNumber] = useState<string>(player.jerseyNumber != null ? String(player.jerseyNumber) : '')
  const [isCaptain, setIsCaptain] = useState(!!player.isCaptain)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/players/${player._id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          battingStyle,
          bowlingArm,
          // clear bowling type if they don't bowl
          bowlingType: bowlingArm ? bowlingType : '',
          jerseyNumber: jerseyNumber === '' ? undefined : Number(jerseyNumber),
          isCaptain,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Failed to save'); return }
      onSaved()
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const selectCls = 'input-field text-sm appearance-none cursor-pointer'

  return (
    <Modal title={`Edit — ${player.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <label className="label">Playing Role</label>
            <select className={selectCls} value={role} onChange={e => setRole(e.target.value)}>
              <option value="">— Not set —</option>
              {PLAYER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="label">Batting</label>
            <select className={selectCls} value={battingStyle} onChange={e => setBattingStyle(e.target.value)}>
              <option value="">— Not set —</option>
              {BATTING_STYLES.map(b => <option key={b} value={b}>{b} ({b === 'RHB' ? 'Right-hand' : 'Left-hand'})</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="label">Jersey #</label>
            <input type="number" min="0" max="999" className="input-field text-sm" placeholder="—"
              value={jerseyNumber} onChange={e => setJerseyNumber(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="label">Bowling Arm</label>
            <select className={selectCls} value={bowlingArm} onChange={e => setBowlingArm(e.target.value)}>
              <option value="">Doesn’t bowl</option>
              {BOWLING_ARMS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="label">Bowling Type</label>
            <select className={`${selectCls} disabled:opacity-40`} value={bowlingType} disabled={!bowlingArm}
              onChange={e => setBowlingType(e.target.value)}>
              <option value="">— Not set —</option>
              {BOWLING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Captain toggle */}
        <button type="button" onClick={() => setIsCaptain(v => !v)}
          className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
            isCaptain ? 'bg-yellow-500/10 border-yellow-500/40' : 'bg-white/[0.03] border-white/10 hover:border-white/20'
          }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isCaptain ? 'bg-yellow-400' : 'bg-slate-700'}`}>
            <Crown size={17} className={isCaptain ? 'text-yellow-900 fill-yellow-900' : 'text-slate-400'} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Team Captain</p>
            <p className="text-[11px] text-slate-400">Only one player can be captain — this replaces the current one.</p>
          </div>
          <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${isCaptain ? 'bg-yellow-400' : 'bg-slate-600'}`}>
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isCaptain ? 'translate-x-5' : ''}`} />
          </div>
        </button>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Profile
          </button>
        </div>
      </div>
    </Modal>
  )
}
