import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Circle, ExternalLink, Loader2, Lock, RefreshCw, Save,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { Brand } from './AuthPage'
import { embedUrl, fmt, jumlahMaks, type Kriteria, type StatusPertandingan } from './lib'

type DataJuri = {
  juri: { id: string; nombor: number; nama: string | null }
  pertandingan: {
    id: string; nama: string; keterangan: string | null; kategori: string | null; tarikh: string | null
    tempat: string | null; rubrik: Kriteria[]; guna_iframe: boolean; status: StatusPertandingan
  }
  peserta: { id: string; no_peserta: string | null; nama_peserta: string; sekolah: string | null; tajuk_karya: string | null; pautan_karya: string | null }[]
  markah: { peserta_id: string; markah: Record<string, number>; jumlah: number; ulasan: string | null }[]
}

export default function JuriPage() {
  const { token } = useParams() as { token: string }
  const [data, setData] = useState<DataJuri | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aktif, setAktif] = useState<string | null>(null)
  const [nilai, setNilai] = useState<Record<string, string>>({})
  const [ulasan, setUlasan] = useState('')
  const [kotor, setKotor] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mesej, setMesej] = useState<{ jenis: 'ok' | 'ralat'; teks: string } | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('pj_juri_data', { p_token: token })
    setError(error ? error.message : !data ? 'Pautan juri tidak sah atau telah ditukar. Sila hubungi admin pertandingan.' : null)
    setData(data as DataJuri | null)
    setLoading(false)
    return data as DataJuri | null
  }, [token])

  useEffect(() => {
    load().then((d) => {
      if (!d?.peserta.length) return
      const belum = d.peserta.find((s) => !d.markah.some((m) => m.peserta_id === s.id))
      setAktif((belum ?? d.peserta[0]).id)
    })
  }, [load])

  const markahIkut = useMemo(() => new Map(data?.markah.map((m) => [m.peserta_id, m]) ?? []), [data])
  const peserta = data?.peserta ?? []
  const idx = peserta.findIndex((s) => s.id === aktif)
  const semasa = idx >= 0 ? peserta[idx] : null
  const rubrik = data?.pertandingan.rubrik ?? []
  const maks = jumlahMaks(rubrik)
  const bolehNilai = data?.pertandingan.status === 'dibuka'

  // Isi borang dengan markah sedia ada apabila peserta ditukar.
  useEffect(() => {
    if (!aktif) return
    const m = markahIkut.get(aktif)
    setNilai(Object.fromEntries(rubrik.map((k) => [k.id, m?.markah?.[k.id] !== undefined ? String(m.markah[k.id]) : ''])))
    setUlasan(m?.ulasan ?? '')
    setKotor(false)
    setMesej(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif])

  useEffect(() => {
    if (!kotor) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [kotor])

  function pilih(id: string) {
    if (id === aktif) return
    if (kotor && !confirm('Markah belum disimpan. Tinggalkan peserta ini?')) return
    setAktif(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const jumlah = rubrik.reduce((s, k) => s + (Number(nilai[k.id]) || 0), 0)
  const lengkap = rubrik.every((k) => nilai[k.id] !== '' && nilai[k.id] !== undefined)
  const salah = rubrik.filter((k) => nilai[k.id] !== '' && (Number(nilai[k.id]) < 0 || Number(nilai[k.id]) > k.maks || Number.isNaN(Number(nilai[k.id]))))

  async function simpan(seterusnya: boolean) {
    if (!semasa) return
    if (!lengkap) return setMesej({ jenis: 'ralat', teks: 'Sila isi markah untuk semua kriteria.' })
    if (salah.length) return setMesej({ jenis: 'ralat', teks: `Markah "${salah[0].kriteria}" mesti antara 0 dan ${salah[0].maks}.` })
    setBusy(true)
    const { error } = await supabase.rpc('pj_juri_simpan', {
      p_token: token,
      p_peserta: semasa.id,
      p_markah: Object.fromEntries(rubrik.map((k) => [k.id, Number(nilai[k.id])])),
      p_ulasan: ulasan,
    })
    setBusy(false)
    if (error) return setMesej({ jenis: 'ralat', teks: error.message })
    setKotor(false)
    const d = await load()
    setMesej({ jenis: 'ok', teks: `Markah ${semasa.nama_peserta} disimpan (${fmt(jumlah)}/${maks}) dan dihantar kepada admin.` })
    if (seterusnya && d) {
      const seterus = d.peserta.slice(idx + 1).find((s) => !d.markah.some((m) => m.peserta_id === s.id))
        ?? d.peserta.find((s) => !d.markah.some((m) => m.peserta_id === s.id))
      if (seterus) setAktif(seterus.id)
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="card max-w-md space-y-3 p-7 text-sm text-slate-700">
          <Brand />
          <AlertTriangle className="mt-3 text-amber-500" size={32} />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const siap = data.markah.length
  const url = semasa?.pautan_karya
  const embed = data.pertandingan.guna_iframe ? embedUrl(url) : null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-teal-900 text-white shadow">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-teal-200">Halaman Juri · {data.juri.nama || `Juri ${data.juri.nombor}`}</p>
            <p className="truncate font-semibold">{data.pertandingan.nama}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{siap}/{peserta.length} dinilai</p>
              <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${peserta.length ? (siap / peserta.length) * 100 : 0}%` }} />
              </div>
            </div>
            <button onClick={() => load()} className="rounded-lg p-2 text-teal-100 hover:bg-white/10" title="Muat semula"><RefreshCw size={18} /></button>
          </div>
        </div>
      </header>

      {!bolehNilai && (
        <div className={`px-4 py-2.5 text-center text-sm ${data.pertandingan.status === 'draf' ? 'bg-amber-100 text-amber-900' : 'bg-violet-100 text-violet-900'}`}>
          <Lock size={14} className="mr-1 inline" />
          {data.pertandingan.status === 'draf'
            ? 'Penjurian belum dibuka oleh admin. Anda boleh meneliti karya dahulu; markah boleh dihantar selepas dibuka.'
            : 'Penjurian telah ditutup. Markah tidak lagi boleh diubah. Terima kasih atas kerjasama anda!'}
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[17rem_1fr]">
        {/* Senarai peserta */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <select className="input lg:hidden" value={aktif ?? ''} onChange={(e) => pilih(e.target.value)}>
            {peserta.map((s) => <option key={s.id} value={s.id}>{markahIkut.has(s.id) ? '✓ ' : '○ '}{s.no_peserta ? `${s.no_peserta} · ` : ''}{s.nama_peserta}</option>)}
          </select>
          <div className="card hidden max-h-[calc(100vh-7rem)] overflow-y-auto lg:block">
            <p className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Peserta</p>
            {peserta.map((s) => {
              const m = markahIkut.get(s.id)
              return (
                <button key={s.id} onClick={() => pilih(s.id)}
                  className={`flex w-full items-center gap-2.5 border-l-4 px-3 py-2.5 text-left text-sm transition ${s.id === aktif ? 'border-teal-700 bg-teal-50' : 'border-transparent hover:bg-slate-50'}`}>
                  {m ? <CheckCircle2 size={17} className="shrink-0 text-emerald-600" /> : <Circle size={17} className="shrink-0 text-slate-300" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{s.nama_peserta}</span>
                    <span className="block truncate text-xs text-slate-500">{[s.no_peserta, s.sekolah].filter(Boolean).join(' · ')}</span>
                  </span>
                  {m && <span className="text-xs font-semibold tabular-nums text-slate-600">{fmt(Number(m.jumlah))}</span>}
                </button>
              )
            })}
            {!peserta.length && <p className="px-4 py-6 text-center text-sm text-slate-500">Belum ada peserta.</p>}
          </div>
        </aside>

        {/* Panel penilaian */}
        {semasa ? (
          <main className="min-w-0 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Peserta {idx + 1} daripada {peserta.length}{semasa.no_peserta ? ` · ${semasa.no_peserta}` : ''}</p>
                <h1 className="text-xl font-semibold text-slate-900">{semasa.nama_peserta}</h1>
                <p className="text-sm text-slate-600">{[semasa.sekolah, semasa.tajuk_karya && `“${semasa.tajuk_karya}”`].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button className="btn-ghost px-2" disabled={idx <= 0} onClick={() => pilih(peserta[idx - 1].id)} aria-label="Sebelum"><ChevronLeft size={18} /></button>
                <button className="btn-ghost px-2" disabled={idx >= peserta.length - 1} onClick={() => pilih(peserta[idx + 1].id)} aria-label="Seterusnya"><ChevronRight size={18} /></button>
              </div>
            </div>

            {embed ? (
              <div className="card overflow-hidden">
                <iframe key={embed} src={embed} title={`Karya ${semasa.nama_peserta}`} className="aspect-video max-h-[70vh] w-full bg-slate-900"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write" allowFullScreen />
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                  <span>Karya tidak dipaparkan? Sesetengah laman menyekat iframe.</span>
                  <a href={url!} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-medium text-teal-700 hover:underline"><ExternalLink size={13} /> Buka di tab baharu</a>
                </div>
              </div>
            ) : url ? (
              <a href={url} target="_blank" rel="noreferrer" className="card flex items-center justify-center gap-2 p-5 font-medium text-teal-700 hover:bg-teal-50">
                <ExternalLink size={18} /> Buka karya peserta
              </a>
            ) : data.pertandingan.guna_iframe ? (
              <div className="card p-5 text-center text-sm text-slate-500">Tiada pautan karya untuk peserta ini.</div>
            ) : null}

            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Rubrik penjurian</h2>
                {markahIkut.has(semasa.id) && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Telah dinilai — boleh dikemas kini</span>}
              </div>
              <div className="space-y-4">
                {rubrik.map((k, i) => {
                  const v = nilai[k.id] ?? ''
                  const ralat = v !== '' && (Number(v) < 0 || Number(v) > k.maks)
                  return (
                    <div key={k.id} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <p className="font-medium text-slate-900">{i + 1}. {k.kriteria} <span className="text-sm font-normal text-slate-500">(maks {k.maks})</span></p>
                        {k.keterangan && <p className="text-xs text-slate-500">{k.keterangan}</p>}
                        <input type="range" min={0} max={k.maks} step={k.maks > 20 ? 1 : 0.5} disabled={!bolehNilai}
                          value={v === '' ? 0 : Number(v)} className="mt-2 w-full accent-teal-700"
                          onChange={(e) => { setNilai({ ...nilai, [k.id]: e.target.value }); setKotor(true) }} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input type="number" inputMode="decimal" min={0} max={k.maks} step="any" disabled={!bolehNilai}
                          className={`input w-24 text-center text-lg font-semibold tabular-nums ${ralat ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
                          value={v} placeholder="—"
                          onChange={(e) => { setNilai({ ...nilai, [k.id]: e.target.value }); setKotor(true) }} />
                        <span className="text-sm text-slate-500">/ {k.maks}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <label className="mt-5 block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Ulasan (pilihan)</span>
                <textarea className="input" rows={2} disabled={!bolehNilai} value={ulasan}
                  onChange={(e) => { setUlasan(e.target.value); setKotor(true) }} placeholder="Kekuatan / cadangan penambahbaikan" />
              </label>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-600">Jumlah: <span className="text-2xl font-bold tabular-nums text-slate-900">{fmt(jumlah)}</span> / {maks}</p>
                {bolehNilai && (
                  <div className="flex gap-2">
                    <button className="btn-ghost" disabled={busy} onClick={() => simpan(false)}><Save size={16} /> Simpan</button>
                    <button className="btn-primary" disabled={busy} onClick={() => simpan(true)}>
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />} Simpan & seterusnya
                    </button>
                  </div>
                )}
              </div>
              {mesej && (
                <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${mesej.jenis === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{mesej.teks}</p>
              )}
            </div>
            {siap === peserta.length && peserta.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 size={18} /> Anda telah menilai semua peserta. Terima kasih! Markah masih boleh dikemas kini selagi penjurian dibuka.
              </div>
            )}
          </main>
        ) : (
          <div className="card p-10 text-center text-sm text-slate-500">
            {data.pertandingan.keterangan || 'Belum ada peserta untuk dinilai.'}
            {data.pertandingan.tarikh && <p className="mt-1">{formatDate(data.pertandingan.tarikh)}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
