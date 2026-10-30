const COLORS: Record<string, string> = {
  Ditempah: 'bg-blue-50 text-blue-700 ring-blue-200',
  Selesai: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Dibatalkan: 'bg-slate-100 text-slate-600 ring-slate-200',
  Dipinjam: 'bg-amber-50 text-amber-800 ring-amber-200',
  Dipulangkan: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Rosak / Hilang': 'bg-red-50 text-red-700 ring-red-200',
  'Di luar pejabat': 'bg-amber-50 text-amber-800 ring-amber-200',
  'Telah kembali': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cuti: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export default function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>
  const color = COLORS[value] ?? 'bg-teal-50 text-teal-800 ring-teal-200'
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>
      {value}
    </span>
  )
}
