import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Award, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { modules } from '../modules'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-teal-700 text-white' : 'text-teal-50/80 hover:bg-teal-800 hover:text-white'
  }`

export default function Layout() {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-200">PPD Kunak</p>
        <p className="mt-0.5 text-base font-semibold leading-tight text-white">Unit Sumber dan Teknologi Pendidikan</p>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3">
        <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        {modules.map((m) => (
          <NavLink key={m.key} to={m.path} className={linkClass} onClick={() => setOpen(false)}>
            <m.icon size={18} /> {m.shortTitle}
          </NavLink>
        ))}
        <NavLink to="/penjurian" className={linkClass} onClick={() => setOpen(false)}>
          <Award size={18} /> Sistem Penjurian
        </NavLink>
      </div>
      <div className="border-t border-teal-800 p-3">
        <p className="truncate px-3 pb-2 text-xs text-teal-200">{session?.user.email}</p>
        <button onClick={() => supabase.auth.signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-teal-50/80 hover:bg-teal-800 hover:text-white">
          <LogOut size={18} /> Log Keluar
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 bg-teal-900 lg:block">{nav}</aside>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-teal-900">{nav}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(!open)} className="rounded-md p-1 text-slate-700" aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="font-semibold text-slate-900">USTP PPD Kunak</span>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
