import { useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Clock, Loader2, LogOut, ShieldAlert, ShieldCheck, Trophy, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Profil } from './lib'
import { useProfil } from './useProfil'
import AuthPage, { Brand } from './AuthPage'
import Dashboard from './Dashboard'
import PertandinganForm from './PertandinganForm'
import PertandinganDetail from './PertandinganDetail'
import SuperAdmin from './SuperAdmin'

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
)

export default function PenjurianApp() {
  const { session, loading } = useAuth()
  const { profil, loading: loadingProfil, error, reload } = useProfil(session?.user.id)

  if (loading) return <Spinner />
  if (!session) {
    return (
      <Routes>
        <Route path="daftar" element={<AuthPage mode="daftar" />} />
        <Route path="*" element={<AuthPage mode="login" />} />
      </Routes>
    )
  }
  if (loadingProfil) return <Spinner />
  if (error) return <Notis icon={<ShieldAlert className="text-red-600" size={36} />} tajuk="Sistem penjurian belum disediakan">
    Jadual pangkalan data penjurian tidak ditemui. Pentadbir perlu menjalankan migration
    <code className="mx-1 rounded bg-slate-100 px-1">20261031000000_penjurian.sql</code> dalam Supabase.
    <p className="mt-2 text-xs text-slate-500">{error}</p>
  </Notis>
  if (!profil) return <MohonAkses onDone={reload} />
  if (profil.status !== 'diluluskan') return <StatusAkaun profil={profil} />

  return (
    <Routes>
      <Route element={<PjLayout profil={profil} />}>
        <Route index element={<Dashboard profil={profil} />} />
        <Route path="pertandingan/baru" element={<PertandinganForm />} />
        <Route path="pertandingan/:id" element={<PertandinganDetail profil={profil} />} />
        <Route path="pertandingan/:id/edit" element={<PertandinganForm />} />
        {profil.peranan === 'super_admin' && <Route path="pentadbir" element={<SuperAdmin profil={profil} />} />}
        <Route path="*" element={<Navigate to="/penjurian" replace />} />
      </Route>
    </Routes>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-white/15 text-white' : 'text-teal-50/80 hover:bg-white/10 hover:text-white'}`

function PjLayout({ profil }: { profil: Profil }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="no-print sticky top-0 z-30 bg-teal-900 shadow">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/penjurian"><Brand light /></Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            <NavLink to="/penjurian" end className={navClass}><Trophy size={15} className="mr-1.5 inline" />Pertandingan</NavLink>
            {profil.peranan === 'super_admin' && (
              <NavLink to="/penjurian/pentadbir" className={navClass}><ShieldCheck size={15} className="mr-1.5 inline" />Super Admin</NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-white">{profil.nama}</p>
              <p className="text-xs text-teal-200">{profil.peranan === 'super_admin' ? 'Super Admin' : 'Admin Pertandingan'}</p>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="rounded-lg p-2 text-teal-100 hover:bg-white/10" title="Log keluar">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

function Notis({ icon, tajuk, children }: { icon: React.ReactNode; tajuk: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card w-full max-w-md space-y-3 p-7 text-sm text-slate-700">
        <Brand />
        <div className="pt-3">{icon}</div>
        <h1 className="text-lg font-semibold text-slate-900">{tajuk}</h1>
        <div>{children}</div>
        <button onClick={() => supabase.auth.signOut()} className="btn-ghost w-full"><LogOut size={16} /> Log keluar</button>
      </div>
    </div>
  )
}

function StatusAkaun({ profil }: { profil: Profil }) {
  if (profil.status === 'menunggu') {
    return (
      <Notis icon={<Clock className="text-amber-500" size={36} />} tajuk="Permohonan sedang disemak">
        Terima kasih, {profil.nama}. Permohonan anda telah diterima dan sedang menunggu kelulusan super admin.
        Halaman ini akan dikemas kini secara automatik sebaik sahaja permohonan diluluskan.
      </Notis>
    )
  }
  return (
    <Notis icon={<XCircle className="text-red-600" size={36} />}
      tajuk={profil.status === 'ditolak' ? 'Permohonan tidak diluluskan' : 'Akaun digantung'}>
      {profil.catatan_kelulusan
        ? <p>Catatan super admin: <i>{profil.catatan_kelulusan}</i></p>
        : <p>Sila hubungi Unit Sumber dan Teknologi Pendidikan, PPD Kunak untuk maklumat lanjut.</p>}
    </Notis>
  )
}

/** Untuk pengguna yang sudah ada akaun (cth. staf USTP) tetapi belum memohon akses penjurian. */
function MohonAkses({ onDone }: { onDone: () => void }) {
  const { session } = useAuth()
  const [form, setForm] = useState({ nama: '', sekolah: '', jawatan: '', no_telefon: '', tujuan: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('pj_profil').insert({ id: session!.user.id, emel: session!.user.email, ...form })
    setBusy(false)
    if (error) return setError(error.message)
    onDone()
  }

  const field = (k: keyof typeof form, label: string, required = false) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input className="input" value={form[k]} required={required} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </label>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-3 p-7">
        <Brand />
        <h1 className="pt-3 text-lg font-semibold text-slate-900">Mohon akses admin pertandingan</h1>
        <p className="text-sm text-slate-600">Anda log masuk sebagai <b>{session?.user.email}</b>. Lengkapkan maklumat untuk memohon.</p>
        {field('nama', 'Nama penuh', true)}
        {field('sekolah', 'Sekolah / Unit', true)}
        {field('jawatan', 'Jawatan')}
        {field('no_telefon', 'No. telefon')}
        {field('tujuan', 'Tujuan penggunaan')}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Hantar Permohonan</button>
        <button type="button" onClick={() => supabase.auth.signOut()} className="btn-ghost w-full">Log keluar</button>
      </form>
    </div>
  )
}
