import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple'
  subtitle?: string
  trend?: string
}

const styles = {
  green:  { wrap: 'stat-green',  icon: 'bg-green-500/15 text-green-400',  val: 'text-green-400', dot: 'bg-green-500' },
  yellow: { wrap: 'stat-yellow', icon: 'bg-yellow-500/15 text-yellow-400', val: 'text-yellow-400', dot: 'bg-yellow-500' },
  red:    { wrap: 'stat-red',    icon: 'bg-red-500/15 text-red-400',       val: 'text-red-400',   dot: 'bg-red-500' },
  blue:   { wrap: 'stat-blue',   icon: 'bg-indigo-500/15 text-indigo-400', val: 'text-indigo-400', dot: 'bg-indigo-500' },
  purple: { wrap: 'stat-blue',   icon: 'bg-purple-500/15 text-purple-400', val: 'text-purple-400', dot: 'bg-purple-500' },
}

export default function StatCard({ title, value, icon: Icon, color, subtitle, trend }: StatCardProps) {
  const s = styles[color]
  return (
    <div className={`card ${s.wrap} p-5 hover:bg-slate-800/80 transition-all duration-300 group cursor-default`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.icon} transition-transform duration-300 group-hover:scale-110`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
            {trend}
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${s.val} mb-1`}>{value}</p>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  )
}
