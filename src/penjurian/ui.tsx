import { useState } from 'react'
import { Check, Copy, Crown, Medal } from 'lucide-react'
import { STATUS_LABEL, type StatusPertandingan } from './lib'

const STATUS_COLOR: Record<StatusPertandingan, string> = {
  draf: 'bg-slate-100 text-slate-700 ring-slate-200',
  dibuka: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ditutup: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export function StatusPill({ status }: { status: StatusPertandingan }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_COLOR[status]}`}>
      {status === 'dibuka' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
      {STATUS_LABEL[status]}
    </span>
  )
}

const RANK_STYLE = [
  'bg-amber-100 text-amber-800 ring-amber-300',
  'bg-slate-200 text-slate-700 ring-slate-300',
  'bg-orange-100 text-orange-800 ring-orange-300',
]

export function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return <span className="text-slate-400">—</span>
  const style = RANK_STYLE[rank - 1] ?? 'bg-white text-slate-700 ring-slate-200'
  return (
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-1 ring-inset ${style}`}>
      {rank === 1 ? <Crown size={15} /> : rank <= 3 ? <Medal size={15} /> : rank}
    </span>
  )
}

export function CopyButton({ text, label = 'Salin' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="btn-ghost px-2.5 py-1.5 text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}>
      {done ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} {done ? 'Disalin' : label}
    </button>
  )
}

export function Bar({ value, max, className = 'bg-teal-600' }: { value: number; max: number; className?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all duration-500 ${className}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
