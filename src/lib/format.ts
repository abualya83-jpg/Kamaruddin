const dateFmt = new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? value : dateFmt.format(d)
}

export function formatTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : '—'
}

export function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
