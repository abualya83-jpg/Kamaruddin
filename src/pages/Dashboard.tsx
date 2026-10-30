import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, formatTime, todayISO } from '../lib/format'
import { moduleByKey } from '../modules'
import StatusBadge from '../components/StatusBadge'

type Takwim = { id: string; tajuk: string; tarikh_mula: string; lokasi: string | null; kategori: string | null }
type Bilik = { id: string; bilik: string; masa_mula: string; masa_tamat: string; nama_pengguna: string; status: string }
type Pegawai = { id: string; nama_pegawai: string; destinasi: string; status: string }
type Aset = { id: string; nama_aset: string; nama_peminjam: string; tarikh_jangka_pulang: string | null }

export default function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [takwim, setTakwim] = useState<Takwim[]>([])
  const [bilik, setBilik] = useState<Bilik[]>([])
  const [pegawai, setPegawai] = useState<Pegawai[]>([])
  const [lewat, setLewat] = useState<Aset[]>([])

  useEffect(() => {
    const today = todayISO()
    const count = (table: string) => supabase.from(table).select('*', { count: 'exact', head: true })

    Promise.all([
      count('guru_perpustakaan'),
      count('pinjaman_aset').eq('status', 'Dipinjam'),
      count('arkib_dokumen'),
      count('one_page_report'),
    ]).then(([guru, aset, arkib, opr]) =>
      setCounts({ guru: guru.count ?? 0, aset: aset.count ?? 0, arkib: arkib.count ?? 0, opr: opr.count ?? 0 }))

    supabase.from('takwim').select('id,tajuk,tarikh_mula,lokasi,kategori')
      .gte('tarikh_mula', today).order('tarikh_mula').limit(5)
      .then(({ data }) => setTakwim(data ?? []))
    supabase.from('penggunaan_bilik').select('id,bilik,masa_mula,masa_tamat,nama_pengguna,status')
      .eq('tarikh', today).order('masa_mula')
      .then(({ data }) => setBilik(data ?? []))
    supabase.from('pergerakan_pegawai').select('id,nama_pegawai,destinasi,status')
      .eq('status', 'Di luar pejabat').order('tarikh_keluar', { ascending: false })
      .then(({ data }) => setPegawai(data ?? []))
    supabase.from('pinjaman_aset').select('id,nama_aset,nama_peminjam,tarikh_jangka_pulang')
      .eq('status', 'Dipinjam').lt('tarikh_jangka_pulang', today).order('tarikh_jangka_pulang')
      .then(({ data }) => setLewat(data ?? []))
  }, [])

  const stats = [
    { label: 'Guru Perpustakaan Media', value: counts.guru, to: moduleByKey.guru.path },
    { label: 'Aset sedang dipinjam', value: counts.aset, to: moduleByKey.aset.path },
    { label: 'One Page Report', value: counts.opr, to: moduleByKey.opr.path },
    { label: 'Dokumen dalam arkib', value: counts.arkib, to: moduleByKey.arkib.path },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">Ringkasan Unit Sumber dan Teknologi Pendidikan PPD Kunak · {formatDate(todayISO())}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card p-4 transition hover:border-teal-300">
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{s.value ?? '–'}</p>
            <p className="text-sm text-slate-600">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Program akan datang" to={moduleByKey.takwim.path} empty="Tiada program akan datang.">
          {takwim.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{t.tajuk}</p>
                <p className="text-xs text-slate-500">{formatDate(t.tarikh_mula)}{t.lokasi && ` · ${t.lokasi}`}</p>
              </div>
              {t.kategori && <StatusBadge value={t.kategori} />}
            </li>
          ))}
        </Panel>

        <Panel title="Penggunaan bilik khas hari ini" to={moduleByKey.bilik.path} empty="Tiada tempahan bilik hari ini.">
          {bilik.map((b) => (
            <li key={b.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{b.bilik}</p>
                <p className="text-xs text-slate-500">{formatTime(b.masa_mula)}–{formatTime(b.masa_tamat)} · {b.nama_pengguna}</p>
              </div>
              <StatusBadge value={b.status} />
            </li>
          ))}
        </Panel>

        <Panel title="Pegawai di luar pejabat" to={moduleByKey.pergerakan.path} empty="Semua pegawai berada di pejabat.">
          {pegawai.map((p) => (
            <li key={p.id} className="px-4 py-2.5">
              <p className="font-medium text-slate-800">{p.nama_pegawai}</p>
              <p className="text-xs text-slate-500">{p.destinasi}</p>
            </li>
          ))}
        </Panel>

        <Panel title="Aset lewat dipulangkan" to={moduleByKey.aset.path} empty="Tiada aset yang lewat dipulangkan.">
          {lewat.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{a.nama_aset}</p>
                <p className="text-xs text-slate-500">{a.nama_peminjam}</p>
              </div>
              <span className="whitespace-nowrap text-xs font-medium text-red-700">
                Sepatutnya {formatDate(a.tarikh_jangka_pulang)}
              </span>
            </li>
          ))}
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, to, empty, children }: {
  title: string; to: string; empty: string; children: ReactNode[]
}) {
  return (
    <section className="card">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <Link to={to} className="text-xs font-medium text-teal-700 hover:underline">Lihat semua</Link>
      </div>
      {children.length ? (
        <ul className="divide-y divide-slate-100 text-sm">{children}</ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-slate-500">{empty}</p>
      )}
    </section>
  )
}
