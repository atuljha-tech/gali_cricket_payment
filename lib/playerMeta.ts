// Cricket profile options — the single source of truth for player specialities.
// Only the superadmin (Rishi) may set these, but everyone can view them.

export const PLAYER_ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'] as const
export const BATTING_STYLES = ['RHB', 'LHB'] as const
export const BOWLING_ARMS = ['Right-arm', 'Left-arm'] as const
export const BOWLING_TYPES = ['Pace', 'Medium', 'Spin'] as const

export type PlayerRole = (typeof PLAYER_ROLES)[number]
export type BattingStyle = (typeof BATTING_STYLES)[number]
export type BowlingArm = (typeof BOWLING_ARMS)[number]
export type BowlingType = (typeof BOWLING_TYPES)[number]

/** "RHB" -> "Right-hand bat" */
export function battingLabel(s?: string): string {
  if (s === 'RHB') return 'Right-hand bat'
  if (s === 'LHB') return 'Left-hand bat'
  return ''
}

/** ("Right-arm","Spin") -> "Right-arm Spin" */
export function bowlingLabel(arm?: string, type?: string): string {
  if (!arm) return ''
  return [arm, type].filter(Boolean).join(' ')
}

/** Short badge like "RHB · Right-arm Spin" for compact display. */
export function specialityLine(p: {
  battingStyle?: string
  bowlingArm?: string
  bowlingType?: string
}): string {
  const parts: string[] = []
  if (p.battingStyle) parts.push(p.battingStyle)
  const bowl = bowlingLabel(p.bowlingArm, p.bowlingType)
  if (bowl) parts.push(bowl)
  return parts.join(' · ')
}

export const isValid = {
  role: (v: unknown): v is PlayerRole | '' => v === '' || (PLAYER_ROLES as readonly string[]).includes(v as string),
  batting: (v: unknown): v is BattingStyle | '' => v === '' || (BATTING_STYLES as readonly string[]).includes(v as string),
  bowlingArm: (v: unknown): v is BowlingArm | '' => v === '' || (BOWLING_ARMS as readonly string[]).includes(v as string),
  bowlingType: (v: unknown): v is BowlingType | '' => v === '' || (BOWLING_TYPES as readonly string[]).includes(v as string),
}
