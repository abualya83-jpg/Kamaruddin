import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ExternalLink, KeyRound, MessageCircle, QrCode } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { pautanJuri, type Juri, type Markah, type Pertandingan, type Peserta } from './lib'
import { Bar, CopyButton } from './ui'

type Props = { pertandingan: Pertandingan; juri: Juri[]; peserta: Peserta[]; markah: Markah[]; owner: boolean; onChange: () => void }

export default function TabJuri({ pertandingan, juri, peserta, markah, owner, onChange }: Props) {
  const [qr, setQr] = useState<Juri | null>(null)

  async function simpanNama(j: Juri, nama: string) {
    if (nama === (j.nama ?? '')) return
    const { error } = await supabase.from('pj_juri').update({ nama: nama || null }).eq('id', j.id)
    if (error) return alert(error.message)
    onChange()
  }

  async function janaSemula(j: Juri) {
    if (!confirm(`Jana pautan baharu untuk ${j.nama || `Juri ${j.nombor}`}? Pautan lama tidak lagi boleh digunakan. Markah sedia ada kekal.`)) return
    const { error } = await supabase.from('pj_juri').update({ token: crypto.randomUUID().replace(/-/g, '') }).eq('id', j.id)
    if (error) return alert(error.message)
    onChange()
  }

  const mesej = (j: Juri) =>
    `Salam ${j.nama || 'Tuan/Puan'},\nAnda dilantik sebagai juri bagi *${pertandingan.nama}*.\nSila masukkan markah melalui pautan berikut (jangan kongsi pautan ini):\n${pautanJuri(j.token)}`

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        Setiap juri mempunyai pautan peribadi — tiada akaun atau kata laluan diperlukan. Hantar pautan melalui WhatsApp atau e-mel.
        {pertandingan.status !== 'dibuka' && <b className="text-amber-700"> Juri hanya boleh menghantar markah selepas penjurian dibuka.</b>}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {juri.map((j) => {
          const siap = markah.filter((m) => m.juri_id === j.id).length
          return (
            <div key={j.id} className="card p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white">J{j.nombor}</span>
                {owner ? (
                  <input className="input" defaultValue={j.nama ?? ''} placeholder={`Nama Juri ${j.nombor}`}
                    onBlur={(e) => simpanNama(j, e.target.value.trim())} />
                ) : <p className="font-medium text-slate-900">{j.nama || `Juri ${j.nombor}`}</p>}
              </div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Peserta dinilai</span><span className="tabular-nums">{siap}/{peserta.length}</span>
              </div>
              <Bar value={siap} max={peserta.length} className={siap >= peserta.length && peserta.length ? 'bg-emerald-500' : 'bg-teal-600'} />
              {owner && (
                <>
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                    <code className="min-w-0 flex-1 truncate px-1 text-xs text-slate-600">{pautanJuri(j.token)}</code>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <CopyButton text={pautanJuri(j.token)} label="Salin pautan" />
                    <a className="btn-ghost px-2.5 py-1.5 text-xs" target="_blank" rel="noreferrer"
                      href={`https://wa.me/?text=${encodeURIComponent(mesej(j))}`}><MessageCircle size={14} /> WhatsApp</a>
                    <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setQr(j)}><QrCode size={14} /> Kod QR</button>
                    <a className="btn-ghost px-2.5 py-1.5 text-xs" target="_blank" rel="noreferrer" href={pautanJuri(j.token)}><ExternalLink size={14} /> Buka</a>
                    <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => janaSemula(j)} title="Jana pautan baharu"><KeyRound size={14} /> Tukar pautan</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      {owner && <p className="mt-4 text-xs text-slate-500">Untuk menambah atau mengurangkan juri, ubah bilangan juri melalui butang Edit.</p>}

      {qr && (
        <Modal title={`Kod QR — ${qr.nama || `Juri ${qr.nombor}`}`} onClose={() => setQr(null)}>
          <div className="flex flex-col items-center gap-3">
            <KodQr text={pautanJuri(qr.token)} />
            <p className="text-center text-sm text-slate-600">Imbas menggunakan kamera telefon untuk membuka halaman penjurian.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

function KodQr({ text }: { text: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => { QRCode.toDataURL(text, { width: 256, margin: 1 }).then(setSrc) }, [text])
  return src ? <img alt="Kod QR pautan juri" className="h-64 w-64" src={src} /> : <div className="h-64 w-64 animate-pulse rounded bg-slate-100" />
}
