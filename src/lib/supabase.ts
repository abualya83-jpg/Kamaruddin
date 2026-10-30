import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)

// Placeholder values keep the client constructible so the app can render a setup notice.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key')

export const BUCKET = 'dokumen'

export async function uploadFile(folder: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.-]+/g, '_')
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw error
  return path
}

export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? null
}

export async function removeFiles(paths: string[]) {
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
}
