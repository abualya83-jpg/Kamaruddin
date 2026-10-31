import { useState, type FormEvent } from 'react'
import { ClipboardPaste, ExternalLink, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { embedUrl, type Markah, type Pertandingan, type Peserta } from './lib'

type Props = { pertandingan: Pertandingan; peserta: Peserta[]; markah: Markah[]; owner: boolean; onChange: () => void }

const KOSONG = { no_peserta: '', nama_peserta: '', sekolah: '', tajuk_karya: '', pautan_karya: '', catatan: '' }

export default function TabPeserta({ pertandingan, peserta, markah, owner, onChange }: Props) {
  const [edit, setEdit] = useState<Peserta | 'baru' | null>(null)
  const [import_, setImport] = useState(false)

  async function padam(s: Peserta) {
    const n = markah.filter((m) => m.peserta_id === s.id).length
    if (!confirm(`Padam peserta ${s.nama_peserta}?${n ? ` ${n} markah juri juga akan dipadam.` : ''}`)) return
    const { error } = await supabase.from('pj_peserta').delete().eq('id', s.id)
    if (error) return alert(error.message)
    onChange()
  }

  return (
    <div>
      {owner && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setEdit('baru')}><Plus size={16} /> Tambah peserta</button>
          <button className="btn-ghost" onClick={() => setImport(true)}><ClipboardPaste size={16} /> Tampal senarai (Excel)</button>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">No.</th>
              <th className="px-3 py-2.5">Nama peserta</th>
              <th className="px-3 py-2.5">Sekolah</th>
              <th className="px-3 py-2.5">Tajuk karya</th>
              <th className="px-3 py-2.5">Karya</th>
              <th className="px-3 py-2.5 text-center">Dinilai</th>
              {owner && <th className="px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {peserta.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 text-slate-500">{s.no_peserta || '—'}</td>
                <td className="px-3 py-2.5 font-medium text-slate-900">{s.nama_peserta}</td>
                <td className="px-3 py-2.5 text-slate-700">{s.sekolah || '—'}</td>
                <td className="px-3 py-2.5 text-slate-700">{s.tajuk_karya || '—'}</td>
                <td className="px-3 py-2.5">
                  {s.pautan_karya
                    ? <a href={s.pautan_karya} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-700 hover:underline"><ExternalLink size={13} /> Buka</a>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {markah.filter((m) => m.peserta_id === s.id).length}/{pertandingan.bilangan_juri}
                </td>
                {owner && (
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setEdit(s)} aria-label="Edit"><Pencil size={15} /></button>
                    <button className="rounded p-1.5 text-red-600 hover:bg-red-50" onClick={() => padam(s)} aria-label="Padam"><Trash2 size={15} /></button>
                  </td>
                )}
              </tr>
            ))}
            {!peserta.length && <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-500">Belum ada peserta. Tambah satu demi satu atau tampal senarai dari Excel.</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && <BorangPeserta pertandingan={pertandingan} peserta={edit === 'baru' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); onChange() }} />}
      {import_ && <ImportPeserta pertandingan={pertandingan} mula={peserta.length} onClose={() => setImport(false)} onSaved={() => { setImport(false); onChange() }} />}
    </div>
  )
}

function BorangPeserta({ pertandingan, peserta, onClose, onSaved }: {
  pertandingan: Pertandingan; peserta: Peserta | null; onClose: () => void; onSaved: () => void
}) {
  const [f, setF] = useState(() => peserta
    ? Object.fromEntries(Object.keys(KOSONG).map((k) => [k, (peserta as Record<string, unknown>)[k] ?? ''])) as typeof KOSONG
    : KOSONG)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pratonton = pertandingan.guna_iframe ? embedUrl(f.pautan_karya) : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const row = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null]))
    const { error } = peserta
      ? await supabase.from('pj_peserta').update(row).eq('id', peserta.id)
      : await supabase.from('pj_peserta').insert({ ...row, pertandingan_id: pertandingan.id })
    setBusy(false)
    if (error) return setError(error.message)
    onSaved()
  }

  const input = (k: keyof typeof KOSONG, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...extra} />
    </label>
  )

  return (
    <Modal title={peserta ? 'Edit peserta' : 'Tambah peserta'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          {input('no_peserta', 'No. peserta', { placeholder: 'cth. P01' })}
          {input('nama_peserta', 'Nama peserta / kumpulan *', { required: true })}
        </div>
        {input('sekolah', 'Sekolah')}
        {input('tajuk_karya', 'Tajuk karya')}
        {input('pautan_karya', 'Pautan karya', { type: 'url', placeholder: 'https://youtu.be/… / Google Drive / Canva / Scratch' })}
        {pratonton && (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <iframe src={pratonton} className="aspect-video w-full" title="Pratonton" allow="autoplay; fullscreen" />
          </div>
        )}
        {input('catatan', 'Catatan')}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Simpan</button>
        </div>
      </form>
    </Modal>
  )
}

function ImportPeserta({ pertandingan, mula, onClose, onSaved }: {
  pertandingan: Pertandingan; mula: number; onClose: () => void; onSaved: () => void
}) {
  const [teks, setTeks] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baris = teks.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    .map((l) => l.split(l.includes('\t') ? '\t' : '|').map((c) => c.trim()))
    .filter((c) => c[0] && !/^nama/i.test(c[0]))

  async function simpan() {
    setBusy(true)
    const rows = baris.map(([nama, sekolah, tajuk, pautan], i) => ({
      pertandingan_id: pertandingan.id,
      no_peserta: `P${String(mula + i + 1).padStart(2, '0')}`,
      nama_peserta: nama,
      sekolah: sekolah || null,
      tajuk_karya: tajuk || null,
      pautan_karya: pautan || null,
    }))
    const { error } = await supabase.from('pj_peserta').insert(rows)
    setBusy(false)
    if (error) return setError(error.message)
    onSaved()
  }

  return (
    <Modal title="Tampal senarai peserta" onClose={onClose} wide>
      <p className="mb-2 text-sm text-slate-600">
        Salin lajur dari Excel / Google Sheets mengikut susunan: <b>Nama · Sekolah · Tajuk karya · Pautan karya</b>.
        Satu peserta setiap baris. Boleh juga dipisahkan dengan <code className="rounded bg-slate-100 px-1">|</code>.
      </p>
      <textarea className="input font-mono text-xs" rows={8} value={teks} onChange={(e) => setTeks(e.target.value)}
        placeholder={'Aisyah binti Ali\tSK Pekan Kunak\tWarisan Kita\thttps://youtu.be/xxxx\nKumpulan Bestari\tSK Kampung Selamat\tAlam Sekitar\thttps://drive.google.com/file/d/xxxx/view'} />
      {baris.length > 0 && (
        <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 text-left text-slate-500"><tr><th className="px-2 py-1.5">No.</th><th className="px-2 py-1.5">Nama</th><th className="px-2 py-1.5">Sekolah</th><th className="px-2 py-1.5">Tajuk</th><th className="px-2 py-1.5">Pautan</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {baris.map((c, i) => (
                <tr key={i}><td className="px-2 py-1">P{String(mula + i + 1).padStart(2, '0')}</td>{[0, 1, 2, 3].map((j) => <td key={j} className="max-w-48 truncate px-2 py-1">{c[j] || '—'}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Batal</button>
        <button className="btn-primary" disabled={!baris.length || busy} onClick={simpan}>
          {busy && <Loader2 size={16} className="animate-spin" />} Tambah {baris.length} peserta
        </button>
      </div>
    </Modal>
  )
}
