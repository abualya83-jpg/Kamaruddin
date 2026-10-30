import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CrudPage from '../components/CrudPage'
import type { Row } from '../components/RecordForm'
import { moduleByKey } from '../modules'
import { todayISO } from '../lib/format'

const HARI = ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd']
const monthFmt = new Intl.DateTimeFormat('ms-MY', { month: 'long', year: 'numeric' })
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function Calendar({ rows }: { rows: Row[] }) {
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const today = todayISO()

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    const lead = (first.getDay() + 6) % 7 // Monday-first
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate()
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: days }, (_, i) => iso(cursor.y, cursor.m, i + 1)),
    ]
  }, [cursor])

  const eventsOn = (day: string) => rows.filter((r) => {
    const start = r.tarikh_mula as string
    const end = (r.tarikh_tamat as string | null) ?? start
    return start <= day && day <= end
  })

  const shift = (delta: number) => setCursor(({ y, m }) => {
    const d = new Date(y, m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold capitalize text-slate-900">{monthFmt.format(new Date(cursor.y, cursor.m, 1))}</h2>
        <div className="flex gap-1">
          <button className="btn-ghost px-2" onClick={() => shift(-1)} aria-label="Bulan sebelum"><ChevronLeft size={16} /></button>
          <button className="btn-ghost" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}>Hari ini</button>
          <button className="btn-ghost px-2" onClick={() => shift(1)} aria-label="Bulan seterusnya"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-xs">
        {HARI.map((h) => <div key={h} className="bg-slate-50 py-1.5 text-center font-medium text-slate-500">{h}</div>)}
        {cells.map((day, i) => {
          const events = day ? eventsOn(day) : []
          return (
            <div key={i} className={`min-h-16 bg-white p-1 sm:min-h-20 ${day ? '' : 'bg-slate-50'}`}>
              {day && (
                <>
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                    day === today ? 'bg-teal-700 font-semibold text-white' : 'text-slate-600'}`}>
                    {Number(day.slice(8))}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {events.slice(0, 2).map((e) => (
                      <p key={e.id} className="truncate rounded bg-teal-50 px-1 text-[11px] text-teal-800" title={e.tajuk as string}>
                        {e.tajuk as string}
                      </p>
                    ))}
                    {events.length > 2 && <p className="px-1 text-[11px] text-slate-500">+{events.length - 2} lagi</p>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TakwimPage() {
  return <CrudPage config={moduleByKey.takwim} above={(rows) => <Calendar rows={rows} />} />
}
