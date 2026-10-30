import { Paperclip } from 'lucide-react'
import { signedUrl } from '../lib/supabase'

export default function FileLink({ path }: { path: string | null }) {
  if (!path) return <span className="text-slate-400">—</span>
  const name = path.split('/').pop()!.replace(/^[0-9a-f-]{36}-/, '')

  async function open() {
    const url = await signedUrl(path!)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <button onClick={open} className="inline-flex max-w-48 items-center gap-1 text-teal-700 hover:underline" title={name}>
      <Paperclip size={14} className="shrink-0" />
      <span className="truncate">{name}</span>
    </button>
  )
}
