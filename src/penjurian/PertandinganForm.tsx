import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Loader2, MonitorPlay, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { idKriteria, jumlahMaks, type Kriteria, type Pertandingan } from './lib'

const RUBRIK_CONTOH: Kriteria[] = [
  { id: idKriteria(), kriteria: 'Kreativiti & keaslian', keterangan: 'Idea baharu, unik dan menarik', maks: 25 },
  { id: idKriteria(), kriteria: 'Isi kandungan', keterangan: 'Tepat, relevan dengan tema', maks: 30 },
  { id: idKriteria(), kriteria: 'Teknikal & persembahan', keterangan: 'Kualiti visual, audio, susun atur', maks: 25 },
  { id: idKriteria(), kriteria: 'Impak keseluruhan', keterangan: 'Mesej sampai kepada penonton', maks: 20 },
]

type FormState = {
  nama: string; keterangan: string; kategori: string; tarikh: string; tempat: string
  rubrik: Kriteria[]; bilangan_juri: number; guna_iframe: boolean
}

export default function PertandinganForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({
    nama: '', keterangan: '', kategori: '', tarikh: '', tempat: '',
    rubrik: RUBRIK_CONTOH, bilangan_juri: 3, guna_iframe: true,
  })
  const [asal, setAsal] = useState<Pertandingan | null>(null)
  const [adaMarkah, setAdaMarkah] = useState(false)
  const [loading, setLoading] = useState(Boolean(id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('pj_pertandingan').select('*').eq('id', id).single(),
      supabase.from('pj_markah').select('id', { count: 'exact', head: true }).eq('pertandingan_id', id),
    ]).then(([p, m]) => {
      if (p.error) setError(p.error.message)
      const d = p.data as Pertandingan | null
      if (d) {
        setAsal(d)
        setForm({
          nama: d.nama, keterangan: d.keterangan ?? '', kategori: d.kategori ?? '', tarikh: d.tarikh ?? '',
          tempat: d.tempat ?? '', rubrik: d.rubrik, bilangan_juri: d.bilangan_juri, guna_iframe: d.guna_iframe,
        })
      }
      setAdaMarkah((m.count ?? 0) > 0)
      setLoading(false)
    })
  }, [id])

  const setK = (i: number, patch: Partial<Kriteria>) =>
    setForm((f) => ({ ...f, rubrik: f.rubrik.map((k, j) => (j === i ? { ...k, ...patch } : k)) }))
  const move = (i: number, d: number) =>
    setForm((f) => {
      const r = [...f.rubrik]
      ;[r[i], r[i + d]] = [r[i + d], r[i]]
      return { ...f, rubrik: r }
    })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.rubrik.length) return setError('Rubrik mesti mempunyai sekurang-kurangnya satu kriteria.')
    if (form.rubrik.some((k) => !k.kriteria.trim() || !(Number(k.maks) > 0))) {
      return setError('Setiap kriteria perlu nama dan markah maksimum lebih daripada 0.')
    }
    if (asal && adaMarkah && form.bilangan_juri < asal.bilangan_juri &&
      !confirm(`Mengurangkan juri akan memadam slot juri ke-${form.bilangan_juri + 1} hingga ${asal.bilangan_juri} berserta markah mereka. Teruskan?`)) return

    setBusy(true)
    const payload = {
      nama: form.nama.trim(),
      keterangan: form.keterangan || null,
      kategori: form.kategori || null,
      tarikh: form.tarikh || null,
      tempat: form.tempat || null,
      rubrik: form.rubrik.map((k) => ({ ...k, kriteria: k.kriteria.trim(), maks: Number(k.maks) })),
      bilangan_juri: form.bilangan_juri,
      guna_iframe: form.guna_iframe,
    }
    const res = id
      ? await supabase.from('pj_pertandingan').update(payload).eq('id', id).select('id').single()
      : await supabase.from('pj_pertandingan').insert(payload).select('id').single()
    setBusy(false)
    if (res.error) return setError(res.error.message)
    navigate(`/penjurian/pertandingan/${res.data.id}`)
  }

  if (loading) return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>

  const maks = jumlahMaks(form.rubrik)

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to={id ? `/penjurian/pertandingan/${id}` : '/penjurian'} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-teal-700">
          <ArrowLeft size={15} /> Kembali
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{id ? 'Kemas Kini Pertandingan' : 'Pertandingan Baharu'}</h1>
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-slate-900">1. Maklumat pertandingan</h2>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Nama pertandingan *</span>
          <input className="input" required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
            placeholder="cth. Pertandingan Video Pendek Hari Kemerdekaan 2026" />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Kategori</span>
            <input className="input" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="cth. Sekolah Rendah" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Tarikh</span>
            <input type="date" className="input" value={form.tarikh} onChange={(e) => setForm({ ...form, tarikh: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Tempat</span>
            <input className="input" value={form.tempat} onChange={(e) => setForm({ ...form, tempat: e.target.value })} placeholder="cth. Dalam talian" />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Keterangan / tema</span>
          <textarea className="input" rows={2} value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
        </label>
      </section>

      <section className="card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">2. Rubrik penjurian</h2>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">Jumlah: {maks} markah</span>
        </div>
        <p className="mb-4 text-sm text-slate-600">Setiap juri akan memberi markah bagi setiap kriteria. Markah akhir peserta ialah purata jumlah markah semua juri.</p>
        {adaMarkah && (
          <p className="mb-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            Markah telah dimasukkan. Mengubah markah maksimum tidak mengira semula markah sedia ada; kriteria baharu perlu dinilai semula oleh juri.
          </p>
        )}
        <div className="space-y-3">
          {form.rubrik.map((k, i) => (
            <div key={k.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-[auto_1fr_7rem_auto]">
              <span className="mt-2 flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">{i + 1}</span>
              <div className="space-y-2">
                <input className="input" placeholder="Nama kriteria" value={k.kriteria} onChange={(e) => setK(i, { kriteria: e.target.value })} required />
                <input className="input text-xs" placeholder="Keterangan / panduan untuk juri (pilihan)" value={k.keterangan ?? ''}
                  onChange={(e) => setK(i, { keterangan: e.target.value })} />
              </div>
              <label className="col-start-2 block sm:col-start-auto">
                <span className="mb-0.5 block text-xs text-slate-500">Markah maks</span>
                <input type="number" min={1} step="any" className="input" value={k.maks}
                  onChange={(e) => setK(i, { maks: e.target.value === '' ? 0 : Number(e.target.value) })} required />
              </label>
              <div className="row-start-1 flex flex-col gap-1 sm:row-start-auto">
                <button type="button" className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Naik"><ArrowUp size={15} /></button>
                <button type="button" className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30" disabled={i === form.rubrik.length - 1} onClick={() => move(i, 1)} aria-label="Turun"><ArrowDown size={15} /></button>
                <button type="button" className="rounded p-1 text-red-600 hover:bg-white" aria-label="Buang"
                  onClick={() => setForm({ ...form, rubrik: form.rubrik.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-3"
          onClick={() => setForm({ ...form, rubrik: [...form.rubrik, { id: idKriteria(), kriteria: '', keterangan: '', maks: 10 }] })}>
          <Plus size={16} /> Tambah kriteria
        </button>
      </section>

      <section className="card grid gap-5 p-5 sm:grid-cols-2">
        <div>
          <h2 className="mb-1 font-semibold text-slate-900">3. Bilangan juri</h2>
          <p className="mb-3 text-sm text-slate-600">Sistem akan menjana pautan unik untuk setiap juri.</p>
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={10} value={Math.min(form.bilangan_juri, 10)} className="flex-1 accent-teal-700"
              onChange={(e) => setForm({ ...form, bilangan_juri: Number(e.target.value) })} />
            <input type="number" min={1} max={20} className="input w-20 text-center" value={form.bilangan_juri}
              onChange={(e) => setForm({ ...form, bilangan_juri: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
          </div>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-slate-900">4. Paparan karya murid</h2>
          <p className="mb-3 text-sm text-slate-600">Paparkan karya (YouTube, Google Drive, Canva, Scratch, laman web) terus dalam halaman juri.</p>
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((v) => (
              <button key={String(v)} type="button" onClick={() => setForm({ ...form, guna_iframe: v })}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${form.guna_iframe === v
                  ? 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-600/20' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                <span className="flex items-center gap-1.5 font-medium">{v && <MonitorPlay size={15} />}{v ? 'Guna iframe' : 'Tanpa iframe'}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{v ? 'Karya dipaparkan dalam halaman' : 'Juri menilai secara langsung / luar talian'}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <Link to={id ? `/penjurian/pertandingan/${id}` : '/penjurian'} className="btn-ghost">Batal</Link>
        <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} {id ? 'Simpan' : 'Cipta Pertandingan'}</button>
      </div>
    </form>
  )
}
