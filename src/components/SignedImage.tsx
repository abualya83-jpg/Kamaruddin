import { useEffect, useState } from 'react'
import { signedUrl } from '../lib/supabase'

export default function SignedImage({ path, className }: { path: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    signedUrl(path).then((u) => alive && setUrl(u))
    return () => { alive = false }
  }, [path])
  return url
    ? <img src={url} alt="" className={className} />
    : <div className={`animate-pulse bg-slate-100 ${className ?? ''}`} />
}
