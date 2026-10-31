import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Loader2, MonitorPlay, Plus, Trophy, Users, UserCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import type { Pertandingan, Profil } from './lib'
import { StatusPill } from './ui'

export type BarisPertandingan = Pertandingan & {
  pj_peserta: { count: number }[]
  pj_markah: { count: number }[]
  pj_profil?: { nama: string; sekolah: string | null } | null
}

export function KadPertandingan({ p, admin }: { p: BarisPertandingan; admin?: boolean }) {
  const peserta = p.pj_peserta[0]?.count ?? 0
  const markah = p.pj_markah[0]?.count ?? 0
  const sasaran = peserta * p.bilangan_juri
  const pct = sasaran ? Math.min(100, Math.round((markah / sasaran) * 100)) : 0
  return (
    <Link to={`/penjurian/pertandingan/${p.id}`} className="card group flex flex-col p-5 transition hover:border-teal-400 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug text-slate-900 group-hover:text-teal-800">{p.nama}</h3>
        <StatusPill status={p.status} />
      </div>
      {admin && p.pj_profil && <p className="mb-2 text-xs text-slate-500">Admin: {p.pj_profil.nama}{p.pj_profil.sekolah ? ` · ${p.pj_profil.sekolah}` : ''}</p>}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {p.tarikh && <span className="flex items-center gap-1"><CalendarDays size={13} />{formatDate(p.tarikh)}</span>}
        <span className="flex items-center gap-1"><Users size={13} />{peserta} peserta</span>
        <span className="flex items-center gap-1"><UserCheck size={13} />{p.bilangan_juri} juri</span>
        {p.guna_iframe && <span className="flex items-center gap-1"><MonitorPlay size={13} />Iframe</span>}
      </div>
      <div className="mt-auto">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Kemajuan penjurian</span><span>{markah}/{sasaran} ({pct}%)</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  )
}

export default function Dashboard({ profil }: { profil: Profil }) {
  const [rows, setRows] = useState<BarisPertandingan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('pj_pertandingan')
      .select('*, pj_peserta(count), pj_markah(count)')
      .eq('admin_id', profil.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setRows((data as BarisPertandingan[]) ?? [])
        setError(error?.message ?? null)
        setLoading(false)
      })
  }, [profil.id])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pertandingan Saya</h1>
          <p className="text-sm text-slate-600">Cipta pertandingan, tetapkan rubrik, edarkan pautan juri dan pantau markah secara langsung.</p>
        </div>
        <Link to="/penjurian/pertandingan/baru" className="btn-primary"><Plus size={16} /> Pertandingan Baharu</Link>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <Trophy className="mb-3 text-teal-600" size={40} />
          <p className="font-semibold text-slate-900">Belum ada pertandingan</p>
          <p className="mb-5 max-w-md text-sm text-slate-600">
            Mulakan dengan mencipta pertandingan: masukkan nama, rubrik penjurian, bilangan juri dan pilih sama ada karya murid dipaparkan dalam iframe.
          </p>
          <Link to="/penjurian/pertandingan/baru" className="btn-primary"><Plus size={16} /> Cipta Pertandingan</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => <KadPertandingan key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}
