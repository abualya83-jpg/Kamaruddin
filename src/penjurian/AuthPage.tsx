import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Award, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function Brand({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${light ? 'bg-white/15 text-white' : 'bg-teal-700 text-white'}`}>
        <Award size={22} />
      </div>
      <div className="leading-tight">
        <p className={`text-base font-semibold ${light ? 'text-white' : 'text-slate-900'}`}>Sistem Penjurian</p>
        <p className={`text-xs ${light ? 'text-teal-100' : 'text-slate-500'}`}>Sekolah-sekolah Daerah Kunak</p>
      </div>
    </div>
  )
}

export default function AuthPage({ mode }: { mode: 'login' | 'daftar' }) {
  const [form, setForm] = useState({
    nama: '', emel: '', kata_laluan: '', sekolah: '', jawatan: '', no_telefon: '', tujuan: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selesai, setSelesai] = useState(false)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: form.emel, password: form.kata_laluan })
      if (error) setError(error.message === 'Invalid login credentials' ? 'E-mel atau kata laluan salah.' : error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.emel,
        password: form.kata_laluan,
        options: {
          emailRedirectTo: `${window.location.origin}/penjurian`,
          data: {
            app: 'penjurian', nama: form.nama, sekolah: form.sekolah,
            jawatan: form.jawatan, no_telefon: form.no_telefon, tujuan: form.tujuan,
          },
        },
      })
      if (error) {
        setError(/registered/i.test(error.message) ? 'E-mel ini telah didaftarkan. Sila log masuk.'
          : /signups not allowed/i.test(error.message) ? 'Pendaftaran belum dibuka oleh pentadbir sistem.'
          : error.message)
      } else if (!data.session) {
        setSelesai(true)
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-700 p-4">
      <div className="card w-full max-w-md p-7">
        <div className="mb-6"><Brand /></div>

        {selesai ? (
          <div className="space-y-3 text-sm text-slate-700">
            <CheckCircle2 className="text-emerald-600" size={36} />
            <p className="text-base font-semibold text-slate-900">Permohonan dihantar</p>
            <p>Sila semak e-mel <b>{form.emel}</b> dan klik pautan pengesahan. Selepas itu, super admin akan menyemak dan
              meluluskan permohonan anda.</p>
            <Link to="/penjurian" className="btn-primary w-full">Ke halaman log masuk</Link>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-lg font-semibold text-slate-900">
              {mode === 'login' ? 'Log masuk admin' : 'Mohon menggunakan sistem'}
            </h1>
            <p className="mb-5 text-sm text-slate-600">
              {mode === 'login'
                ? 'Untuk super admin dan admin pertandingan. Juri tidak perlu log masuk — gunakan pautan juri.'
                : 'Isi maklumat di bawah. Akaun boleh digunakan selepas diluluskan oleh super admin PPD Kunak.'}
            </p>
            <form onSubmit={submit} className="space-y-3">
              {mode === 'daftar' && (
                <>
                  <Input label="Nama penuh" value={form.nama} onChange={set('nama')} required />
                  <Input label="Sekolah / Unit" value={form.sekolah} onChange={set('sekolah')} required placeholder="cth. SK Pekan Kunak" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="Jawatan" value={form.jawatan} onChange={set('jawatan')} placeholder="cth. Guru Penyelaras" />
                    <Input label="No. telefon" type="tel" value={form.no_telefon} onChange={set('no_telefon')} />
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Tujuan penggunaan</span>
                    <textarea className="input" rows={2} value={form.tujuan} onChange={set('tujuan')}
                      placeholder="cth. Pertandingan Video Pendek Peringkat Sekolah 2026" />
                  </label>
                </>
              )}
              <Input label="E-mel" type="email" value={form.emel} onChange={set('emel')} required />
              <Input label="Kata laluan" type="password" value={form.kata_laluan} onChange={set('kata_laluan')} required
                minLength={mode === 'daftar' ? 8 : undefined} />
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button className="btn-primary w-full" disabled={loading}>
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === 'login' ? 'Log Masuk' : 'Hantar Permohonan'}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-600">
              {mode === 'login' ? (
                <>Belum ada akaun? <Link to="/penjurian/daftar" className="font-medium text-teal-700 hover:underline">Mohon di sini</Link></>
              ) : (
                <>Sudah ada akaun? <Link to="/penjurian" className="font-medium text-teal-700 hover:underline">Log masuk</Link></>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input className="input" {...props} />
    </label>
  )
}
