import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './lib/auth'
import { isConfigured, supabase } from './lib/supabase'
import { moduleByKey } from './modules'
import Layout from './components/Layout'
import CrudPage from './components/CrudPage'
import Login from './pages/Login'
import SetupNotice from './pages/SetupNotice'
import Dashboard from './pages/Dashboard'
import TakwimPage from './pages/TakwimPage'
import OprPage from './pages/OprPage'
import OprPrint from './pages/OprPrint'

const PenjurianApp = lazy(() => import('./penjurian/PenjurianApp'))
const JuriPage = lazy(() => import('./penjurian/JuriPage'))
const KeputusanUmum = lazy(() => import('./penjurian/KeputusanUmum'))

const plainModules = ['guru', 'bilik', 'aset', 'arkib', 'pergerakan'].map((k) => moduleByKey[k])

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
)

export default function App() {
  if (!isConfigured) return <SetupNotice />
  return (
    <Suspense fallback={<Spinner />}>
    <Routes>
      {/* Sistem Penjurian */}
      <Route path="/juri/:token" element={<JuriPage />} />
      <Route path="/keputusan/:id" element={<KeputusanUmum />} />
      <Route path="/penjurian/*" element={<PenjurianApp />} />
      {/* Sistem USTP */}
      <Route path="*" element={<UstpApp />} />
    </Routes>
    </Suspense>
  )
}

function UstpApp() {
  const { session, loading } = useAuth()
  const [akses, setAkses] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session) return setAkses(null)
    supabase.rpc('ustp_ada_akses').then(({ data, error }) =>
      // Jika fungsi belum wujud (migration penjurian belum dijalankan), kekalkan tingkah laku asal.
      setAkses(error ? true : Boolean(data)))
  }, [session])

  if (loading) return <Spinner />
  if (!session) return <Login />
  if (akses === null) return <Spinner />
  // Akaun admin pertandingan tiada akses ke data USTP.
  if (!akses) return <Navigate to="/penjurian" replace />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path={moduleByKey.takwim.path} element={<TakwimPage />} />
        <Route path={moduleByKey.opr.path} element={<OprPage />} />
        <Route path={`${moduleByKey.opr.path}/:id/cetak`} element={<OprPrint />} />
        {plainModules.map((m) => (
          <Route key={m.key} path={m.path} element={<CrudPage key={m.key} config={m} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
