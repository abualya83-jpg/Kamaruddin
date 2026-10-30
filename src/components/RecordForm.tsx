import { useState, type FormEvent } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import type { Field, ModuleConfig } from '../modules'
import { supabase, uploadFile, removeFiles } from '../lib/supabase'
import { todayISO } from '../lib/format'
import SignedImage from './SignedImage'

export type Row = Record<string, unknown> & { id: string }

const MAX_IMAGES = 4

function initialValues(fields: Field[], row?: Row) {
  const values: Record<string, string> = {}
  for (const f of fields) {
    if (f.type === 'images') continue
    const v = row?.[f.name]
    if (v !== undefined && v !== null) values[f.name] = String(v).slice(0, f.type === 'time' ? 5 : undefined)
    else if (!row && f.defaultValue) values[f.name] = f.defaultValue
    else if (!row && f.type === 'date' && f.required) values[f.name] = todayISO()
    else values[f.name] = ''
  }
  return values
}

export default function RecordForm({ config, row, onSaved, onCancel }: {
  config: ModuleConfig
  row?: Row
  onSaved: () => void
  onCancel: () => void
}) {
  const [values, setValues] = useState(() => initialValues(config.fields, row))
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [newImages, setNewImages] = useState<File[]>([])
  const [keptImages, setKeptImages] = useState<string[]>(() => (row?.gambar as string[] | undefined) ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }))

  async function generate() {
    const targets = config.aiFields!
    if (!values.tajuk_program?.trim()) return setError('Isi Tajuk Program dahulu sebelum menjana dengan AI.')
    const filled = targets.filter((t) => values[t].trim())
    if (filled.length && !confirm('Ruangan yang sudah diisi akan diganti dengan cadangan AI. Teruskan?')) return

    setGenerating(true)
    setError(null)
    try {
      const { data } = await supabase.auth.getSession()
      const res = await fetch('/api/jana-opr', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify(values),
      })
      const body = await res.json().catch(() => ({ error: 'Pelayan AI tidak memberi jawapan yang sah.' }))
      if (!res.ok) throw new Error(body.error)
      setValues((v) => ({ ...v, ...Object.fromEntries(targets.map((t) => [t, body[t] ?? v[t]])) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const uploaded: string[] = []
    try {
      const payload: Record<string, unknown> = {}
      for (const f of config.fields) {
        if (f.type === 'images') {
          for (const img of newImages) uploaded.push(await uploadFile(config.table, img))
          payload[f.name] = [...keptImages, ...uploaded]
        } else if (f.type === 'file') {
          const file = files[f.name]
          if (file) {
            const path = await uploadFile(config.table, file)
            uploaded.push(path)
            payload[f.name] = path
          }
        } else {
          const v = values[f.name].trim()
          payload[f.name] = v === '' ? null : f.type === 'number' ? Number(v) : v
        }
      }

      const { error } = row
        ? await supabase.from(config.table).update(payload).eq('id', row.id)
        : await supabase.from(config.table).insert(payload)
      if (error) throw error

      // Clean up storage objects that are no longer referenced.
      if (row) {
        const stale: string[] = []
        for (const f of config.fields) {
          if (f.type === 'file' && files[f.name] && row[f.name]) stale.push(row[f.name] as string)
          if (f.type === 'images') {
            stale.push(...((row[f.name] as string[] | null) ?? []).filter((p) => !keptImages.includes(p)))
          }
        }
        await removeFiles(stale)
      }
      onSaved()
    } catch (err) {
      await removeFiles(uploaded)
      setError(err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {config.aiFields && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-sm text-violet-900">
            Isi tajuk dan ringkasan aktiviti, kemudian biar AI jana{' '}
            {config.aiFields.map((n) => config.fields.find((f) => f.name === n)!.label.toLowerCase()).join(', ')}.
          </p>
          <button type="button" onClick={generate} disabled={generating}
            className="btn bg-violet-700 text-white hover:bg-violet-800">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'Menjana…' : 'Jana dengan AI'}
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {config.fields.map((f) => (
          <label key={f.name} className={`block ${f.full ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {f.label} {f.required && <span className="text-red-600">*</span>}
            </span>
            {f.type === 'textarea' ? (
              <textarea className="input min-h-24" value={values[f.name]} required={f.required}
                placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
            ) : f.type === 'select' ? (
              <select className="input" value={values[f.name]} required={f.required}
                onChange={(e) => set(f.name, e.target.value)}>
                <option value="">— Pilih —</option>
                {f.options!.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : f.type === 'file' ? (
              <div className="space-y-1">
                <input type="file" className="input file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1 file:text-teal-800"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                  onChange={(e) => setFiles((s) => ({ ...s, [f.name]: e.target.files?.[0] ?? null }))} />
                {row?.[f.name] != null && !files[f.name] && (
                  <p className="text-xs text-slate-500">Fail sedia ada dikekalkan jika tiada fail baru dipilih.</p>
                )}
              </div>
            ) : f.type === 'images' ? (
              <div className="space-y-2">
                {(keptImages.length > 0 || newImages.length > 0) && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {keptImages.map((p) => (
                      <div key={p} className="relative">
                        <SignedImage path={p} className="h-24 w-full rounded-lg object-cover" />
                        <button type="button" onClick={() => setKeptImages((k) => k.filter((x) => x !== p))}
                          className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-700 shadow" aria-label="Buang gambar">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {newImages.map((file, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(file)} alt="" className="h-24 w-full rounded-lg object-cover" />
                        <button type="button" onClick={() => setNewImages((n) => n.filter((_, j) => j !== i))}
                          className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-700 shadow" aria-label="Buang gambar">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {keptImages.length + newImages.length < MAX_IMAGES && (
                  <input type="file" accept="image/*" multiple
                    className="input file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1 file:text-teal-800"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? [])
                      setNewImages((n) => [...n, ...picked].slice(0, MAX_IMAGES - keptImages.length))
                      e.target.value = ''
                    }} />
                )}
              </div>
            ) : (
              <input type={f.type} className="input" value={values[f.name]} required={f.required}
                placeholder={f.placeholder} min={f.type === 'number' ? 0 : undefined}
                onChange={(e) => set(f.name, e.target.value)} />
            )}
          </label>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button type="button" className="btn-ghost" onClick={onCancel}>Batal</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {row ? 'Simpan Perubahan' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}
