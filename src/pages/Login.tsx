import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Award, BookOpen, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message === 'Invalid login credentials' ? 'E-mel atau kata laluan salah.' : error.message)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-900 to-teal-700 p-4">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white">
            <BookOpen size={24} />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Sistem USTP PPD Kunak</h1>
          <p className="text-sm text-slate-600">Unit Sumber dan Teknologi Pendidikan</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">E-mel</span>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Kata Laluan</span>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading && <Loader2 size={16} className="animate-spin" />} Log Masuk
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">
          Akaun pengguna didaftarkan oleh pentadbir sistem.
        </p>
        <Link to="/penjurian" className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50">
          <Award size={16} /> Sistem Penjurian Sekolah Daerah Kunak
        </Link>
      </div>
    </div>
  )
}
