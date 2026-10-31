import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, BarChart3, CalendarDays, ExternalLink, Globe, Loader2, Lock, MapPin, MonitorPlay, Pencil,
  Play, Printer, Radio, RotateCcw, Settings, Trash2, UserCheck, Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import {
  fmt, jumlahMaks, kiraKedudukan, pautanKeputusan,
  type BarisKedudukan, type Juri, type Markah, type Pertandingan, type Peserta, type Profil, type StatusPertandingan,
} from './lib'
import { BannerStatus, JadualKedudukan, Podium } from './Keputusan'
import { CopyButton, StatusPill } from './ui'
import Modal from '../components/Modal'
import TabPeserta from './TabPeserta'
import TabJuri from './TabJuri'

type Tab = 'keputusan' | 'peserta' | 'juri' | 'tetapan'
type Toast = { id: number; teks: string }

export default function PertandinganDetail({ profil }: { profil: Profil }) {
  const { id } = useParams() as { id: string }
  const navigate = useNavigate()
  const [p, setP] = useState<Pertandingan | null>(null)
  const [juri, setJuri] = useState<Juri[]>([])
  const [peserta, setPeserta] = useState<Peserta[]>([])
  const [markah, setMarkah] = useState<Markah[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('keputusan')
  const [live, setLive] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [sorot, setSorot] = useState<Set<string>>(new Set())
  const [pilih, setPilih] = useState<BarisKedudukan | null>(null)

  const owner = p?.admin_id === profil.id
  const refs = useRef({ juri, peserta })
  refs.current = { juri, peserta }

  const loadMarkah = useCallback(async () => {
    const { data } = await supabase.from('pj_markah').select('*').eq('pertandingan_id', id)
    setMarkah((data as Markah[]) ?? [])
  }, [id])

  const loadAll = useCallback(async () => {
    const [pr, jr, ps] = await Promise.all([
      supabase.from('pj_pertandingan').select('*').eq('id', id).single(),
      supabase.from('pj_juri').select('*').eq('pertandingan_id', id).order('nombor'),
      supabase.from('pj_peserta').select('*').eq('pertandingan_id', id).order('no_peserta', { nullsFirst: false }).order('created_at'),
    ])
    setError(pr.error?.message ?? jr.error?.message ?? ps.error?.message ?? null)
    setP(pr.data as Pertandingan)
    setJuri((jr.data as Juri[]) ?? [])
    setPeserta((ps.data as Peserta[]) ?? [])
    await loadMarkah()
    setLoading(false)
  }, [id, loadMarkah])

  useEffect(() => { loadAll() }, [loadAll])

  // Realtime: markah juri terus masuk ke papan keputusan admin.
  useEffect(() => {
    const ch = supabase
      .channel(`pj-markah-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pj_markah', filter: `pertandingan_id=eq.${id}` }, (payload) => {
        if (payload.eventType === 'DELETE') return void loadMarkah()
        const m = payload.new as Markah
        setMarkah((prev) => [...prev.filter((x) => !(x.juri_id === m.juri_id && x.peserta_id === m.peserta_id)), m])
        const j = refs.current.juri.find((x) => x.id === m.juri_id)
        const s = refs.current.peserta.find((x) => x.id === m.peserta_id)
        const tid = Date.now() + Math.random()
        setToasts((t) => [...t.slice(-3), { id: tid, teks: `${j?.nama || `Juri ${j?.nombor ?? ''}`} → ${s?.nama_peserta ?? 'peserta'}: ${fmt(Number(m.jumlah))} markah` }])
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== tid)), 5000)
        setSorot((prev) => new Set(prev).add(m.peserta_id))
        setTimeout(() => setSorot((prev) => { const n = new Set(prev); n.delete(m.peserta_id); return n }), 2500)
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(ch) }
  }, [id, loadMarkah])

  const maks = p ? jumlahMaks(p.rubrik) : 0
  const { baris, semuaLengkap } = useMemo(
    () => kiraKedudukan(peserta, markah, p?.bilangan_juri ?? 0, maks), [peserta, markah, p, maks])
  const sasaran = peserta.length * juri.length
  const diterima = markah.filter((m) => juri.some((j) => j.id === m.juri_id)).length

  async function update(patch: Partial<Pertandingan>) {
    const { data, error } = await supabase.from('pj_pertandingan').update(patch).eq('id', id).select().single()
    if (error) return alert(error.message)
    setP(data as Pertandingan)
  }

  async function setStatus(status: StatusPertandingan) {
    if (status === 'dibuka' && (!peserta.length || !p?.rubrik.length)) {
      return alert('Tambah sekurang-kurangnya seorang peserta dan satu kriteria rubrik sebelum membuka penjurian.')
    }
    if (status === 'ditutup' && !semuaLengkap &&
      !confirm('Masih ada penilaian yang belum lengkap. Tutup penjurian juga? Juri tidak lagi boleh menghantar markah.')) return
    await update({ status })
  }

  async function resetMarkah() {
    if (!confirm('Padam SEMUA markah juri untuk pertandingan ini? Tindakan ini tidak boleh dibatalkan.')) return
    const { error } = await supabase.from('pj_markah').delete().eq('pertandingan_id', id)
    if (error) return alert(error.message)
    loadMarkah()
  }

  async function padam() {
    if (!confirm(`Padam pertandingan "${p?.nama}" berserta semua peserta, juri dan markah?`)) return
    const { error } = await supabase.from('pj_pertandingan').delete().eq('id', id)
    if (error) return alert(error.message)
    navigate('/penjurian')
  }

  if (loading) return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
  if (!p) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error ?? 'Pertandingan tidak ditemui.'}</p>

  const tabs: { key: Tab; label: string; icon: typeof Users; hide?: boolean }[] = [
    { key: 'keputusan', label: 'Keputusan Langsung', icon: BarChart3 },
    { key: 'peserta', label: `Peserta (${peserta.length})`, icon: Users },
    { key: 'juri', label: `Juri (${juri.length})`, icon: UserCheck },
    { key: 'tetapan', label: 'Tetapan', icon: Settings, hide: !owner },
  ]

  return (
    <div>
      <Link to={owner ? '/penjurian' : '/penjurian/pentadbir'} className="no-print mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-teal-700">
        <ArrowLeft size={15} /> Kembali
      </Link>

      {/* Kepala */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{p.nama}</h1>
            <span className="no-print"><StatusPill status={p.status} /></span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            {p.kategori && <span>{p.kategori}</span>}
            {p.tarikh && <span className="flex items-center gap-1"><CalendarDays size={14} />{formatDate(p.tarikh)}</span>}
            {p.tempat && <span className="flex items-center gap-1"><MapPin size={14} />{p.tempat}</span>}
            <span className="no-print flex items-center gap-1"><MonitorPlay size={14} />{p.guna_iframe ? 'Paparan iframe' : 'Tanpa iframe'}</span>
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {owner && p.status === 'draf' && <button className="btn-primary" onClick={() => setStatus('dibuka')}><Play size={16} /> Buka Penjurian</button>}
          {owner && p.status === 'dibuka' && <button className="btn bg-violet-700 text-white hover:bg-violet-800" onClick={() => setStatus('ditutup')}><Lock size={16} /> Tutup Penjurian</button>}
          {owner && p.status === 'ditutup' && <button className="btn-ghost" onClick={() => setStatus('dibuka')}><RotateCcw size={16} /> Buka Semula</button>}
          {owner && <Link to={`/penjurian/pertandingan/${id}/edit`} className="btn-ghost"><Pencil size={16} /> Edit</Link>}
          <button className="btn-ghost" onClick={() => { setTab('keputusan'); setTimeout(() => window.print(), 50) }}><Printer size={16} /> Cetak</button>
        </div>
      </div>

      {/* Statistik */}
      <div className="no-print mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Peserta" value={peserta.length} />
        <Stat label="Juri" value={juri.length} />
        <Stat label="Penilaian diterima" value={`${diterima}/${sasaran}`} sub={sasaran ? `${Math.round((diterima / sasaran) * 100)}%` : undefined} />
        <div className="card flex items-center gap-3 p-4">
          <Radio size={22} className={live ? 'animate-pulse text-emerald-600' : 'text-slate-400'} />
          <div>
            <p className="text-sm font-semibold text-slate-900">{live ? 'Realtime aktif' : 'Menyambung…'}</p>
            <p className="text-xs text-slate-500">Markah juri dikemas kini serta-merta</p>
          </div>
        </div>
      </div>

      {/* Tab */}
      <div className="no-print mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.filter((t) => !t.hide).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${tab === t.key
              ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'keputusan' && (
        <div className="space-y-5">
          <div className="no-print"><BannerStatus semuaLengkap={semuaLengkap} baki={Math.max(0, sasaran - diterima)} ditutup={p.status === 'ditutup'} /></div>
          <p className="hidden text-sm print:block">
            Keputusan {semuaLengkap ? 'muktamad' : 'sementara'} · {diterima}/{sasaran} penilaian · Markah akhir = purata jumlah markah juri (maks {maks})
          </p>
          <Podium baris={baris} maks={maks} />
          <JadualKedudukan baris={baris} maks={maks} juri={juri} bilanganJuri={p.bilangan_juri} onPilih={setPilih} sorot={sorot} />
          <p className="no-print text-xs text-slate-500">Klik pada peserta untuk melihat pecahan markah mengikut kriteria dan ulasan juri. Markah sama berkongsi kedudukan.</p>
        </div>
      )}
      {tab === 'peserta' && <TabPeserta pertandingan={p} peserta={peserta} markah={markah} owner={owner} onChange={loadAll} />}
      {tab === 'juri' && <TabJuri pertandingan={p} juri={juri} peserta={peserta} markah={markah} owner={owner} onChange={loadAll} />}
      {tab === 'tetapan' && owner && (
        <div className="max-w-3xl space-y-4">
          <section className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Globe size={17} /> Hebahkan keputusan kepada umum</h2>
                <p className="mt-1 text-sm text-slate-600">Apabila dihidupkan, sesiapa yang mempunyai pautan boleh melihat kedudukan peserta (tanpa markah individu juri). Sesuai untuk dipaparkan di skrin semasa majlis.</p>
              </div>
              <button role="switch" aria-checked={p.keputusan_umum} onClick={() => update({ keputusan_umum: !p.keputusan_umum })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${p.keputusan_umum ? 'bg-teal-600' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${p.keputusan_umum ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            {p.keputusan_umum && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
                <code className="min-w-0 flex-1 truncate px-1 text-xs text-slate-700">{pautanKeputusan(p.id)}</code>
                <CopyButton text={pautanKeputusan(p.id)} />
                <a href={pautanKeputusan(p.id)} target="_blank" rel="noreferrer" className="btn-ghost px-2.5 py-1.5 text-xs"><ExternalLink size={14} /> Buka</a>
              </div>
            )}
          </section>
          <section className="card p-5">
            <h2 className="font-semibold text-slate-900">Status penjurian</h2>
            <p className="mt-1 text-sm text-slate-600">
              <b>Draf</b> — juri boleh melihat tetapi belum boleh menilai. <b>Dibuka</b> — juri boleh menghantar/mengemas kini markah.
              <b> Ditutup</b> — markah dikunci; keputusan muktamad.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['draf', 'dibuka', 'ditutup'] as StatusPertandingan[]).map((s) => (
                <button key={s} disabled={p.status === s} onClick={() => setStatus(s)}
                  className={p.status === s ? 'btn bg-teal-700 text-white' : 'btn-ghost'}>{s[0].toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          </section>
          <section className="card border-red-200 p-5">
            <h2 className="font-semibold text-red-700">Zon bahaya</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-ghost text-red-700" onClick={resetMarkah}><RotateCcw size={16} /> Padam semua markah</button>
              <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={padam}><Trash2 size={16} /> Padam pertandingan</button>
            </div>
          </section>
        </div>
      )}

      {pilih && <PecahanMarkah baris={pilih} p={p} juri={juri} markah={markah} onClose={() => setPilih(null)} />}

      {/* Notifikasi realtime */}
      <div className="no-print fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
            <Radio size={16} className="shrink-0 text-emerald-400" /> {t.teks}
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value} {sub && <span className="text-sm font-normal text-slate-500">{sub}</span>}</p>
    </div>
  )
}

function PecahanMarkah({ baris, p, juri, markah, onClose }: {
  baris: BarisKedudukan; p: Pertandingan; juri: Juri[]; markah: Markah[]; onClose: () => void
}) {
  const ms = juri.map((j) => ({ j, m: markah.find((x) => x.juri_id === j.id && x.peserta_id === baris.peserta.id) }))
  const maks = jumlahMaks(p.rubrik)
  return (
    <Modal title={baris.peserta.nama_peserta} onClose={onClose} wide>
      <p className="mb-4 text-sm text-slate-600">
        {[baris.peserta.sekolah, baris.peserta.tajuk_karya].filter(Boolean).join(' · ')}
        {baris.peserta.pautan_karya && <> · <a href={baris.peserta.pautan_karya} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">Lihat karya</a></>}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Kriteria</th>
              {ms.map(({ j }) => <th key={j.id} className="px-3 py-2 text-center">{j.nama || `Juri ${j.nombor}`}</th>)}
              <th className="px-3 py-2 text-center">Purata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {p.rubrik.map((k) => {
              const vals = ms.map(({ m }) => m?.markah?.[k.id]).filter((v): v is number => typeof v === 'number')
              return (
                <tr key={k.id}>
                  <td className="px-3 py-2">{k.kriteria} <span className="text-xs text-slate-400">/{k.maks}</span></td>
                  {ms.map(({ j, m }) => <td key={j.id} className="px-3 py-2 text-center tabular-nums">{m?.markah?.[k.id] ?? <span className="text-slate-300">—</span>}</td>)}
                  <td className="px-3 py-2 text-center font-medium tabular-nums">{vals.length ? fmt(vals.reduce((a, b) => a + b, 0) / vals.length) : '—'}</td>
                </tr>
              )
            })}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-3 py-2">Jumlah <span className="text-xs font-normal text-slate-400">/{maks}</span></td>
              {ms.map(({ j, m }) => <td key={j.id} className="px-3 py-2 text-center tabular-nums">{m ? fmt(Number(m.jumlah)) : '—'}</td>)}
              <td className="px-3 py-2 text-center tabular-nums text-teal-800">{baris.bilJuri ? fmt(baris.purata) : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {ms.some(({ m }) => m?.ulasan) && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">Ulasan juri</h3>
          {ms.filter(({ m }) => m?.ulasan).map(({ j, m }) => (
            <p key={j.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><b>{j.nama || `Juri ${j.nombor}`}:</b> {m!.ulasan}</p>
          ))}
        </div>
      )}
    </Modal>
  )
}
