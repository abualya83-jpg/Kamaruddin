export type Kriteria = { id: string; kriteria: string; keterangan?: string; maks: number }

export type StatusPertandingan = 'draf' | 'dibuka' | 'ditutup'

export type Pertandingan = {
  id: string
  admin_id: string
  nama: string
  keterangan: string | null
  kategori: string | null
  tarikh: string | null
  tempat: string | null
  rubrik: Kriteria[]
  bilangan_juri: number
  guna_iframe: boolean
  status: StatusPertandingan
  keputusan_umum: boolean
  created_at: string
}

export type Juri = { id: string; pertandingan_id: string; nombor: number; nama: string | null; token: string }

export type Peserta = {
  id: string
  pertandingan_id?: string
  no_peserta: string | null
  nama_peserta: string
  sekolah: string | null
  tajuk_karya: string | null
  pautan_karya?: string | null
  catatan?: string | null
}

export type Markah = {
  id?: string
  pertandingan_id?: string
  juri_id: string
  peserta_id: string
  markah?: Record<string, number>
  jumlah: number
  ulasan?: string | null
  updated_at?: string
}

export type Profil = {
  id: string
  nama: string
  emel: string
  sekolah: string | null
  jawatan: string | null
  no_telefon: string | null
  tujuan: string | null
  peranan: 'super_admin' | 'admin'
  status: 'menunggu' | 'diluluskan' | 'ditolak' | 'digantung'
  catatan_kelulusan: string | null
  disemak_pada: string | null
  created_at: string
}

export const STATUS_LABEL: Record<StatusPertandingan, string> = {
  draf: 'Draf',
  dibuka: 'Penjurian Dibuka',
  ditutup: 'Penjurian Ditutup',
}

export const jumlahMaks = (rubrik: Kriteria[]) => rubrik.reduce((s, k) => s + Number(k.maks || 0), 0)

export const ANUGERAH = ['Johan', 'Naib Johan', 'Tempat Ketiga']

export function labelAnugerah(kedudukan: number | null) {
  if (!kedudukan) return '—'
  return ANUGERAH[kedudukan - 1] ?? `Tempat Ke-${kedudukan}`
}

export type BarisKedudukan = {
  peserta: Peserta
  markahJuri: Record<string, number>
  bilJuri: number
  purata: number
  peratus: number
  kedudukan: number | null
  lengkap: boolean
}

/**
 * Kira kedudukan: markah akhir = purata jumlah markah semua juri yang telah menilai.
 * Markah sama berkongsi kedudukan (cth. 1, 1, 3). Peserta belum dinilai di bawah sekali.
 */
export function kiraKedudukan(peserta: Peserta[], markah: Markah[], bilanganJuri: number, maks: number) {
  const ikutPeserta = new Map<string, Record<string, number>>()
  for (const m of markah) {
    const rec = ikutPeserta.get(m.peserta_id) ?? {}
    rec[m.juri_id] = Number(m.jumlah)
    ikutPeserta.set(m.peserta_id, rec)
  }

  const baris: BarisKedudukan[] = peserta.map((p) => {
    const markahJuri = ikutPeserta.get(p.id) ?? {}
    const nilai = Object.values(markahJuri)
    const purata = nilai.length ? nilai.reduce((a, b) => a + b, 0) / nilai.length : 0
    return {
      peserta: p,
      markahJuri,
      bilJuri: nilai.length,
      purata,
      peratus: maks ? (purata / maks) * 100 : 0,
      kedudukan: null,
      lengkap: nilai.length >= bilanganJuri,
    }
  })

  baris.sort((a, b) =>
    (b.bilJuri > 0 ? 1 : 0) - (a.bilJuri > 0 ? 1 : 0) ||
    b.purata - a.purata ||
    a.peserta.nama_peserta.localeCompare(b.peserta.nama_peserta))

  let rank = 0
  baris.forEach((b, i) => {
    if (!b.bilJuri) return
    if (i === 0 || Math.abs(b.purata - baris[i - 1].purata) > 1e-9) rank = i + 1
    b.kedudukan = rank
  })

  const semuaLengkap = peserta.length > 0 && baris.every((b) => b.lengkap)
  return { baris, semuaLengkap }
}

export const fmt = (n: number, d = 2) => (Number.isInteger(n) ? String(n) : n.toFixed(d))

/** Tukar pautan biasa kepada pautan yang boleh dipaparkan dalam iframe. */
export function embedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\.|^m\./, '')

  if (host === 'youtu.be') return `https://www.youtube.com/embed/${url.pathname.slice(1)}`
  if (host === 'youtube.com') {
    const v = url.searchParams.get('v')
    if (v) return `https://www.youtube.com/embed/${v}`
    const m = url.pathname.match(/^\/(shorts|live)\/([^/]+)/)
    if (m) return `https://www.youtube.com/embed/${m[2]}`
  }
  if (host === 'drive.google.com') {
    const m = url.pathname.match(/\/file\/d\/([^/]+)/)
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
    const id = url.searchParams.get('id')
    if (id) return `https://drive.google.com/file/d/${id}/preview`
  }
  if (host === 'docs.google.com') {
    const m = url.pathname.match(/^\/(document|presentation|spreadsheets|forms)\/d\/([^/]+)/)
    if (m) return `https://docs.google.com/${m[1]}/d/${m[2]}/preview`
  }
  if (host === 'canva.com' && url.pathname.includes('/design/')) {
    const base = url.pathname.replace(/\/(edit|view)\/?$/, '/view')
    return `https://www.canva.com${base}?embed`
  }
  if (host === 'scratch.mit.edu') {
    const m = url.pathname.match(/\/projects\/(\d+)/)
    if (m) return `https://scratch.mit.edu/projects/${m[1]}/embed`
  }
  return url.toString()
}

export function pautanJuri(token: string) {
  return `${window.location.origin}/juri/${token}`
}

export function pautanKeputusan(id: string) {
  return `${window.location.origin}/keputusan/${id}`
}

export function idKriteria() {
  return `k${Math.random().toString(36).slice(2, 8)}`
}
