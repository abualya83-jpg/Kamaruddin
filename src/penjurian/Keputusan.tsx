import { CheckCircle2, Clock, Trophy } from 'lucide-react'
import { fmt, labelAnugerah, type BarisKedudukan, type Juri } from './lib'
import { Bar, RankBadge } from './ui'

const PODIUM = [
  { ring: 'ring-amber-300', bg: 'from-amber-50 to-amber-100/60', text: 'text-amber-800', order: 'sm:order-2', h: 'sm:pt-0' },
  { ring: 'ring-slate-300', bg: 'from-slate-50 to-slate-100', text: 'text-slate-700', order: 'sm:order-1', h: 'sm:pt-8' },
  { ring: 'ring-orange-300', bg: 'from-orange-50 to-orange-100/60', text: 'text-orange-800', order: 'sm:order-3', h: 'sm:pt-12' },
]

export function Podium({ baris, maks }: { baris: BarisKedudukan[]; maks: number }) {
  const top = baris.filter((b) => b.kedudukan && b.kedudukan <= 3)
  if (!top.length) return null
  return (
    <div className="grid items-end gap-3 sm:grid-cols-3">
      {top.slice(0, 3).map((b) => {
        const s = PODIUM[Math.min((b.kedudukan ?? 1) - 1, 2)]
        return (
          <div key={b.peserta.id} className={`${s.order} ${s.h}`}>
            <div className={`rounded-xl bg-white bg-gradient-to-b ${s.bg} p-4 text-center ring-1 ${s.ring}`}>
              <Trophy className={`mx-auto mb-1 ${s.text}`} size={b.kedudukan === 1 ? 30 : 24} />
              <p className={`text-xs font-bold uppercase tracking-wider ${s.text}`}>{labelAnugerah(b.kedudukan)}</p>
              <p className="mt-1 font-semibold leading-snug text-slate-900">{b.peserta.nama_peserta}</p>
              {b.peserta.sekolah && <p className="text-xs text-slate-600">{b.peserta.sekolah}</p>}
              {b.peserta.tajuk_karya && <p className="mt-0.5 text-xs italic text-slate-500">“{b.peserta.tajuk_karya}”</p>}
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{fmt(b.purata)}<span className="text-sm font-normal text-slate-500">/{maks}</span></p>
              <p className="text-xs text-slate-500">{fmt(b.peratus, 1)}%</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function BannerStatus({ semuaLengkap, baki, ditutup }: { semuaLengkap: boolean; baki: number; ditutup?: boolean }) {
  return semuaLengkap ? (
    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
      <CheckCircle2 size={18} />
      <span><b>Keputusan {ditutup ? 'muktamad' : 'lengkap'}.</b> Semua juri telah menilai semua peserta — pemenang telah ditentukan.</span>
    </div>
  ) : (
    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200">
      <Clock size={18} />
      <span><b>Keputusan sementara.</b> {baki} penilaian lagi belum diterima. Kedudukan dikemas kini secara automatik.</span>
    </div>
  )
}

export function JadualKedudukan({ baris, maks, juri, bilanganJuri, onPilih, sorot }: {
  baris: BarisKedudukan[]
  maks: number
  juri?: Juri[]
  bilanganJuri: number
  onPilih?: (b: BarisKedudukan) => void
  sorot?: Set<string>
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2.5 text-center">#</th>
            <th className="px-3 py-2.5">Peserta</th>
            {juri?.map((j) => <th key={j.id} className="px-2 py-2.5 text-center whitespace-nowrap" title={j.nama ?? ''}>J{j.nombor}</th>)}
            <th className="px-3 py-2.5 text-right">Markah akhir</th>
            <th className="hidden px-3 py-2.5 sm:table-cell">Anugerah</th>
            <th className="px-3 py-2.5 text-center">Juri</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {baris.map((b) => (
            <tr key={b.peserta.id} onClick={onPilih ? () => onPilih(b) : undefined}
              className={`transition-colors duration-700 ${onPilih ? 'cursor-pointer hover:bg-slate-50' : ''} ${sorot?.has(b.peserta.id) ? 'bg-teal-50' : ''}`}>
              <td className="px-3 py-2.5 text-center"><RankBadge rank={b.kedudukan} /></td>
              <td className="px-3 py-2.5">
                <p className="font-medium text-slate-900">
                  {b.peserta.no_peserta && <span className="mr-1.5 text-xs text-slate-400">{b.peserta.no_peserta}</span>}
                  {b.peserta.nama_peserta}
                </p>
                <p className="text-xs text-slate-500">{[b.peserta.sekolah, b.peserta.tajuk_karya].filter(Boolean).join(' · ')}</p>
              </td>
              {juri?.map((j) => (
                <td key={j.id} className="px-2 py-2.5 text-center tabular-nums">
                  {b.markahJuri[j.id] !== undefined ? fmt(b.markahJuri[j.id]) : <span className="text-slate-300">·</span>}
                </td>
              ))}
              <td className="min-w-28 px-3 py-2.5 text-right">
                <p className="font-semibold tabular-nums text-slate-900">{b.bilJuri ? fmt(b.purata) : '—'}<span className="text-xs font-normal text-slate-400">/{maks}</span></p>
                {b.bilJuri > 0 && <><Bar value={b.purata} max={maks} /><p className="text-[11px] text-slate-500">{fmt(b.peratus, 1)}%</p></>}
              </td>
              <td className="hidden px-3 py-2.5 text-sm font-medium text-slate-700 sm:table-cell">
                {b.kedudukan && b.kedudukan <= 3 ? labelAnugerah(b.kedudukan) : b.kedudukan ? `Ke-${b.kedudukan}` : '—'}
              </td>
              <td className="px-3 py-2.5 text-center">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.lengkap ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {b.bilJuri}/{bilanganJuri}
                </span>
              </td>
            </tr>
          ))}
          {!baris.length && (
            <tr><td colSpan={99} className="px-3 py-10 text-center text-slate-500">Belum ada peserta.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
