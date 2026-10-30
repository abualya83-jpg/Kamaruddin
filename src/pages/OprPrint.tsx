import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { moduleByKey } from '../modules'
import SignedImage from '../components/SignedImage'

type Opr = {
  tajuk_program: string; tarikh: string; tempat: string | null; anjuran: string | null
  sasaran: string | null; bilangan_peserta: number | null; objektif: string | null
  ringkasan_aktiviti: string | null; impak: string | null; cadangan: string | null
  disediakan_oleh: string | null; gambar: string[]
}

export default function OprPrint() {
  const { id } = useParams()
  const [opr, setOpr] = useState<Opr | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('one_page_report').select('*').eq('id', id!).single()
      .then(({ data, error }) => error ? setError(error.message) : setOpr(data))
  }, [id])

  if (error) return <p className="text-sm text-red-700">{error}</p>
  if (!opr) return <div className="flex justify-center p-10 text-slate-400"><Loader2 className="animate-spin" /></div>

  const info = [
    ['Tarikh', formatDate(opr.tarikh)],
    ['Tempat', opr.tempat],
    ['Anjuran', opr.anjuran],
    ['Sasaran', opr.sasaran],
    ['Bilangan Peserta', opr.bilangan_peserta],
  ].filter(([, v]) => v !== null && v !== '')

  const sections = [
    ['Objektif', opr.objektif],
    ['Ringkasan Aktiviti', opr.ringkasan_aktiviti],
    ['Impak / Rumusan', opr.impak],
    ['Cadangan Penambahbaikan', opr.cadangan],
  ].filter(([, v]) => v)

  return (
    <div className="space-y-4">
      <div className="no-print flex justify-between">
        <Link to={moduleByKey.opr.path} className="btn-ghost"><ArrowLeft size={16} /> Kembali</Link>
        <button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Cetak / Simpan PDF</button>
      </div>

      <article className="mx-auto max-w-[210mm] bg-white p-8 text-[13px] leading-relaxed text-slate-800 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-4 border-b-2 border-teal-700 pb-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            One Page Report · Unit Sumber dan Teknologi Pendidikan PPD Kunak
          </p>
          <h1 className="mt-1 text-xl font-bold uppercase text-slate-900">{opr.tajuk_program}</h1>
        </header>

        <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1">
          {info.map(([k, v]) => (
            <div key={k as string} className="flex gap-2">
              <dt className="w-32 shrink-0 font-semibold">{k}</dt>
              <dd>: {v}</dd>
            </div>
          ))}
        </dl>

        {sections.map(([k, v]) => (
          <section key={k as string} className="mb-3">
            <h2 className="mb-0.5 font-bold uppercase text-teal-800">{k}</h2>
            <p className="whitespace-pre-line">{v}</p>
          </section>
        ))}

        {opr.gambar.length > 0 && (
          <section className="mb-3">
            <h2 className="mb-1 font-bold uppercase text-teal-800">Gambar Aktiviti</h2>
            <div className="grid grid-cols-2 gap-2">
              {opr.gambar.map((p) => <SignedImage key={p} path={p} className="h-44 w-full rounded object-cover" />)}
            </div>
          </section>
        )}

        {opr.disediakan_oleh && (
          <footer className="mt-6">
            <p>Disediakan oleh,</p>
            <p className="mt-8 font-semibold">{opr.disediakan_oleh}</p>
          </footer>
        )}
      </article>
    </div>
  )
}
