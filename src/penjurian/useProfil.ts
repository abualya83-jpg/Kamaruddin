import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profil } from './lib'

/** Profil sistem penjurian bagi pengguna log masuk (null jika belum memohon). */
export function useProfil(userId: string | undefined) {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) {
      setProfil(null)
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('pj_profil').select('*').eq('id', userId).maybeSingle()
    setError(error?.message ?? null)
    setProfil((data as Profil) ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
    if (!userId) return
    // Kemas kini serta-merta apabila super admin meluluskan permohonan.
    const ch = supabase
      .channel(`pj-profil-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pj_profil', filter: `id=eq.${userId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, load])

  return { profil, loading, error, reload: load }
}
