import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, Check, Loader2, RotateCcw, Search, Trophy, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Profil } from './lib'
import { KadPertandingan, type BarisPertandingan } from './Dashboard'

const STATUS_STYLE: Record<Profil['status'], string> = {
  menunggu: 'bg-amber-50 text-amber-800 ring-amber-200',
  diluluskan: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ditolak: 'bg-red-50 text-red-700 ring-red-200',
  digantung: 'bg-slate-100 text-slate-600 ring-slate-200',
}
const STATUS_TEKS: Record<Profil['status'], string> = {
  menunggu: 'Menunggu', diluluskan: 'Diluluskan', ditolak: 'Ditolak', digantung: 'Digantung',
}

export default function SuperAdmin({ profil: saya }: { profil: Profil }) {
  const [tab, setTab] = useState<'permohonan' | 'pertandingan'>('permohonan')
  const [profil, setProfil] = useState<Profil[]>([])
  const [pertandingan, setPertandingan] = useState<BarisPertandingan[]>([])
  const [loading, setLoading] = useState(true)
  const [tapis, setTapis] = useState<Profil['status'] | ''>('menunggu')
  const [cari, setCari] = useState('')

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from('pj_profil').select('*').order('created_at', { ascending: false }),
      supabase.from('pj_pertandingan').select('*, pj_peserta(count), pj_markah(count), pj_profil(nama, sekolah)').order('created_at', { ascending: false }),
    ])
    setProfil((a.data as Profil[]) ?? [])
    setPertandingan((b.data as BarisPertandingan[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Permohonan baharu muncul serta-merta.
    const ch = supabase.channel('pj-super-profil')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pj_profil' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  async function tukar(p: Profil, status: Profil['status']) {
    let catatan: string | null = p.catatan_kelulusan
    if (status === 'ditolak' || status === 'digantung') {
      const c = prompt(`Sebab ${status === 'ditolak' ? 'permohonan ditolak' : 'akaun digantung'} (akan dipaparkan kepada pemohon):`, '')
      if (c === null) return
      catatan = c || null
    } else if (status === 'diluluskan') catatan = null
    const { error } = await supabase.from('pj_profil')
      .update({ status, catatan_kelulusan: catatan, disemak_oleh: saya.id, disemak_pada: new Date().toISOString() })
      .eq('id', p.id)
    if (error) return alert(error.message)
    load()
  }

  const kiraan = useMemo(() => profil.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {}), [profil])
  const senarai = profil.filter((p) => (!tapis || p.status === tapis) &&
    (!cari || [p.nama, p.emel, p.sekolah].some((v) => v?.toLowerCase().includes(cari.toLowerCase()))))

  if (loading) return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Super Admin</h1>
      <p className="mb-5 text-sm text-slate-600">Luluskan permohonan admin pertandingan dan pantau semua pertandingan dalam daerah.</p>

      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {([['permohonan', `Permohonan & Pengguna`, Users], ['pertandingan', `Semua Pertandingan (${pertandingan.length})`, Trophy]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon size={15} /> {label}
            {k === 'permohonan' && kiraan.menunggu ? <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white">{kiraan.menunggu}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'permohonan' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(['menunggu', 'diluluskan', 'ditolak', 'digantung', ''] as const).map((s) => (
              <button key={s} onClick={() => setTapis(s)}
                className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${tapis === s ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'}`}>
                {s ? STATUS_TEKS[s] : 'Semua'} <span className="opacity-70">{s ? kiraan[s] ?? 0 : profil.length}</span>
              </button>
            ))}
            <div className="relative ml-auto w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Cari nama, e-mel, sekolah" value={cari} onChange={(e) => setCari(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            {senarai.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{p.nama}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[p.status]}`}>{STATUS_TEKS[p.status]}</span>
                    {p.peranan === 'super_admin' && <span className="rounded-full bg-teal-700 px-2 py-0.5 text-xs font-medium text-white">Super Admin</span>}
                  </div>
                  <p className="text-sm text-slate-600">{[p.jawatan, p.sekolah].filter(Boolean).join(' · ') || '—'}</p>
                  <p className="text-sm text-slate-500">{p.emel}{p.no_telefon ? ` · ${p.no_telefon}` : ''}</p>
                  {p.tujuan && <p className="mt-1 text-sm text-slate-700"><span className="text-slate-500">Tujuan:</span> {p.tujuan}</p>}
                  {p.catatan_kelulusan && <p className="mt-1 text-xs italic text-slate-500">Catatan: {p.catatan_kelulusan}</p>}
                  <p className="mt-1 text-xs text-slate-400">Dimohon {new Date(p.created_at).toLocaleString('ms-MY')}</p>
                </div>
                {p.id !== saya.id && (
                  <div className="flex flex-wrap gap-2">
                    {p.status !== 'diluluskan' && (
                      <button className="btn bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => tukar(p, 'diluluskan')}>
                        {p.status === 'menunggu' ? <Check size={16} /> : <RotateCcw size={16} />} {p.status === 'menunggu' ? 'Luluskan' : 'Aktifkan'}
                      </button>
                    )}
                    {p.status === 'menunggu' && <button className="btn-ghost text-red-700" onClick={() => tukar(p, 'ditolak')}><X size={16} /> Tolak</button>}
                    {p.status === 'diluluskan' && <button className="btn-ghost text-red-700" onClick={() => tukar(p, 'digantung')}><Ban size={16} /> Gantung</button>}
                  </div>
                )}
              </div>
            ))}
            {!senarai.length && <div className="card px-6 py-12 text-center text-sm text-slate-500">Tiada rekod.</div>}
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pertandingan.map((p) => <KadPertandingan key={p.id} p={p} admin />)}
          {!pertandingan.length && <div className="card col-span-full px-6 py-12 text-center text-sm text-slate-500">Belum ada pertandingan.</div>}
        </div>
      )}
    </div>
  )
}
