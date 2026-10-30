import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pencil, Plus, Search, Trash2, Loader2 } from 'lucide-react'
import type { ModuleConfig } from '../modules'
import { supabase, removeFiles } from '../lib/supabase'
import { formatDate, formatTime } from '../lib/format'
import Modal from './Modal'
import RecordForm, { type Row } from './RecordForm'
import StatusBadge from './StatusBadge'
import FileLink from './FileLink'

export default function CrudPage({ config, above, rowActions }: {
  config: ModuleConfig
  /** Extra content rendered between the header and the table, e.g. a calendar. */
  above?: (rows: Row[]) => ReactNode
  rowActions?: (row: Row) => ReactNode
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<Row | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from(config.table)
      .select('*')
      .order(config.orderBy.column, { ascending: config.orderBy.ascending })
      .limit(2000)
    setError(error?.message ?? null)
    setRows((data as Row[]) ?? [])
    setLoading(false)
  }, [config])

  useEffect(() => { load() }, [load])

  const fieldsByName = useMemo(() => Object.fromEntries(config.fields.map((f) => [f.name, f])), [config])
  const statusOptions = config.statusField ? fieldsByName[config.statusField].options ?? [] : []

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) =>
      (!statusFilter || r[config.statusField!] === statusFilter) &&
      (!q || config.searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(q))),
    )
  }, [rows, query, statusFilter, config])

  async function remove(row: Row) {
    if (!confirm('Padam rekod ini? Tindakan ini tidak boleh dibatalkan.')) return
    const { error } = await supabase.from(config.table).delete().eq('id', row.id)
    if (error) return alert(error.message)
    const paths = config.fields.flatMap((f) =>
      f.type === 'file' && row[f.name] ? [row[f.name] as string]
        : f.type === 'images' ? (row[f.name] as string[] | null) ?? [] : [])
    await removeFiles(paths)
    load()
  }

  function cell(row: Row, name: string) {
    const field = fieldsByName[name]
    const value = row[name] as string | null
    if (name === config.statusField) return <StatusBadge value={value} />
    if (field.type === 'date') return <span className="whitespace-nowrap">{formatDate(value)}</span>
    if (field.type === 'time') return formatTime(value)
    if (field.type === 'file') return <FileLink path={value} />
    if (value === null || value === '') return <span className="text-slate-400">—</span>
    return <span className="line-clamp-2">{String(value)}</span>
  }

  const Icon = config.icon

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-teal-50 p-2 text-teal-700"><Icon size={22} /></div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{config.title}</h1>
            <p className="text-sm text-slate-600">{config.description}</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <Plus size={16} /> Tambah Rekod
        </button>
      </header>

      {above?.(rows)}

      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Cari…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {statusOptions.length > 0 && (
            <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua {fieldsByName[config.statusField!].label.toLowerCase()}</option>
              {statusOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          )}
        </div>

        {error ? (
          <p className="p-6 text-sm text-red-700">Ralat memuatkan data: {error}</p>
        ) : loading ? (
          <div className="flex justify-center p-10 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">
            {rows.length === 0 ? 'Belum ada rekod. Klik "Tambah Rekod" untuk mula.' : 'Tiada rekod yang sepadan.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {config.columns.map((c) => (
                    <th key={c} className="px-4 py-2.5 font-medium">{fieldsByName[c].label}</th>
                  ))}
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-slate-50/60">
                    {config.columns.map((c) => <td key={c} className="px-4 py-3 text-slate-700">{cell(row, c)}</td>)}
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        {rowActions?.(row)}
                        <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700"
                          onClick={() => setEditing(row)} title="Kemas kini" aria-label="Kemas kini">
                          <Pencil size={16} />
                        </button>
                        <button className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => remove(row)} title="Padam" aria-label="Padam">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Memaparkan {visible.length} daripada {rows.length} rekod
          </p>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? `Tambah — ${config.shortTitle}` : `Kemas Kini — ${config.shortTitle}`}
          onClose={() => setEditing(null)} wide={config.fields.length > 10}>
          <RecordForm config={config} row={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); load() }} />
        </Modal>
      )}
    </div>
  )
}
