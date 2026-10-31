import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Maximize, Radio } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { Brand } from './AuthPage'
import { jumlahMaks, kiraKedudukan, type Kriteria, type Markah, type Peserta, type StatusPertandingan } from './lib'
import { BannerStatus, JadualKedudukan, Podium } from './Keputusan'

type Data = {
  pertandingan: {
    id: string; nama: string; keterangan: string | null; kategori: string | null; tarikh: string | null
    tempat: string | null; rubrik: Kriteria[]; bilangan_juri: number; status: StatusPertandingan
  }
  peserta: Peserta[]
  markah: Markah[]
}

/** Papan keputusan awam — dikemas kini automatik setiap 10 saat (sesuai untuk skrin besar). */
export default function KeputusanUmum() {
  const { id } = useParams() as { id: string }
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('pj_keputusan_umum', { p_id: id })
    setData(data as Data | null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  const maks = data ? jumlahMaks(data.pertandingan.rubrik) : 0
  const { baris, semuaLengkap } = useMemo(
    () => data ? kiraKedudukan(data.peserta, data.markah, data.pertandingan.bilangan_juri, maks) : { baris: [], semuaLengkap: false },
    [data, maks])

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="card max-w-md space-y-3 p-7 text-sm text-slate-700"><Brand /><p className="pt-2">Keputusan pertandingan ini belum dihebahkan.</p></div>
      </div>
    )
  }

  const p = data.pertandingan
  const sasaran = data.peserta.length * p.bilangan_juri
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-900 via-teal-800 to-slate-50 to-[22rem]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Brand light />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white"><Radio size={13} className="animate-pulse text-emerald-300" /> Langsung</span>
            <button onClick={() => document.documentElement.requestFullscreen?.()} className="rounded-lg p-2 text-teal-100 hover:bg-white/10" title="Skrin penuh"><Maximize size={18} /></button>
          </div>
        </div>
        <div className="mb-6 text-center text-white">
          <p className="text-sm uppercase tracking-widest text-teal-200">Keputusan Pertandingan</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{p.nama}</h1>
          <p className="mt-1 text-sm text-teal-100">{[p.kategori, p.tarikh && formatDate(p.tarikh), p.tempat].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="space-y-5">
          <Podium baris={baris} maks={maks} />
          <BannerStatus semuaLengkap={semuaLengkap} baki={Math.max(0, sasaran - data.markah.length)} ditutup={p.status === 'ditutup'} />
          <JadualKedudukan baris={baris} maks={maks} bilanganJuri={p.bilangan_juri} />
        </div>
      </div>
    </div>
  )
}
