import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './lib/auth'
import { isConfigured } from './lib/supabase'
import { moduleByKey } from './modules'
import Layout from './components/Layout'
import CrudPage from './components/CrudPage'
import Login from './pages/Login'
import SetupNotice from './pages/SetupNotice'
import Dashboard from './pages/Dashboard'
import TakwimPage from './pages/TakwimPage'
import OprPage from './pages/OprPage'
import OprPrint from './pages/OprPrint'

const plainModules = ['guru', 'bilik', 'aset', 'arkib', 'pergerakan'].map((k) => moduleByKey[k])

export default function App() {
  const { session, loading } = useAuth()

  if (!isConfigured) return <SetupNotice />
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
  }
  if (!session) return <Login />

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
