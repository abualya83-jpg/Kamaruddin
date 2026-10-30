import {
  Users, CalendarDays, DoorOpen, FileText, Package, Archive, MapPin, type LucideIcon,
} from 'lucide-react'

export type FieldType =
  | 'text' | 'textarea' | 'date' | 'time' | 'number' | 'email' | 'tel' | 'select' | 'file' | 'images'

export type Field = {
  name: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  /** Span both columns of the form grid. */
  full?: boolean
  placeholder?: string
  defaultValue?: string
}

export type ModuleConfig = {
  key: string
  path: string
  table: string
  title: string
  shortTitle: string
  description: string
  icon: LucideIcon
  fields: Field[]
  /** Field names shown as table columns. */
  columns: string[]
  searchFields: string[]
  orderBy: { column: string; ascending: boolean }
  /** Field used for the filter dropdown and coloured badge. */
  statusField?: string
  /** Fields the "Jana dengan AI" button fills in via /api/jana-opr. */
  aiFields?: string[]
}

export const BILIK_PKG = [
  'Bilik Mesyuarat PKG',
  'Makmal Komputer',
  'Bilik Tayangan',
  'Studio Rakaman',
  'Bilik Latihan',
]

export const modules: ModuleConfig[] = [
  {
    key: 'guru',
    path: '/guru-perpustakaan',
    table: 'guru_perpustakaan',
    title: 'Guru Perpustakaan Media Daerah Kunak',
    shortTitle: 'Guru Perpustakaan Media',
    description: 'Maklumat Guru Perpustakaan Media (GPM) di sekolah-sekolah Daerah Kunak.',
    icon: Users,
    fields: [
      { name: 'nama', label: 'Nama', type: 'text', required: true, full: true },
      { name: 'sekolah', label: 'Sekolah', type: 'text', required: true },
      { name: 'kod_sekolah', label: 'Kod Sekolah', type: 'text', placeholder: 'cth. XBA1234' },
      { name: 'jawatan', label: 'Jawatan', type: 'text', defaultValue: 'Guru Perpustakaan Media' },
      { name: 'opsyen', label: 'Opsyen / Pengkhususan', type: 'text' },
      { name: 'no_telefon', label: 'No. Telefon', type: 'tel' },
      { name: 'emel', label: 'E-mel', type: 'email' },
      { name: 'tahun_lantikan', label: 'Tahun Dilantik sebagai GPM', type: 'number' },
      { name: 'catatan', label: 'Catatan', type: 'textarea', full: true },
    ],
    columns: ['nama', 'sekolah', 'no_telefon', 'emel', 'tahun_lantikan'],
    searchFields: ['nama', 'sekolah', 'kod_sekolah'],
    orderBy: { column: 'sekolah', ascending: true },
  },
  {
    key: 'takwim',
    path: '/takwim',
    table: 'takwim',
    title: 'Takwim USTP',
    shortTitle: 'Takwim USTP',
    description: 'Jadual program dan aktiviti Unit Sumber dan Teknologi Pendidikan.',
    icon: CalendarDays,
    fields: [
      { name: 'tajuk', label: 'Tajuk Program / Aktiviti', type: 'text', required: true, full: true },
      { name: 'tarikh_mula', label: 'Tarikh Mula', type: 'date', required: true },
      { name: 'tarikh_tamat', label: 'Tarikh Tamat', type: 'date' },
      { name: 'masa', label: 'Masa', type: 'text', placeholder: 'cth. 8.00 pagi – 1.00 petang' },
      { name: 'lokasi', label: 'Lokasi', type: 'text' },
      {
        name: 'kategori', label: 'Kategori', type: 'select',
        options: ['Mesyuarat', 'Kursus / Bengkel', 'Pertandingan', 'Pemantauan', 'Program NILAM', 'Lain-lain'],
      },
      { name: 'penganjur', label: 'Penganjur', type: 'text', defaultValue: 'USTP PPD Kunak' },
      { name: 'catatan', label: 'Catatan', type: 'textarea', full: true },
    ],
    columns: ['tarikh_mula', 'tajuk', 'kategori', 'lokasi', 'masa'],
    searchFields: ['tajuk', 'lokasi', 'penganjur'],
    orderBy: { column: 'tarikh_mula', ascending: true },
    statusField: 'kategori',
  },
  {
    key: 'bilik',
    path: '/bilik-khas',
    table: 'penggunaan_bilik',
    title: 'Rekod Penggunaan Bilik Khas PKG',
    shortTitle: 'Bilik Khas PKG',
    description: 'Tempahan dan rekod penggunaan bilik khas Pusat Kegiatan Guru.',
    icon: DoorOpen,
    fields: [
      { name: 'bilik', label: 'Bilik', type: 'select', options: BILIK_PKG, required: true },
      { name: 'tarikh', label: 'Tarikh', type: 'date', required: true },
      { name: 'masa_mula', label: 'Masa Mula', type: 'time', required: true },
      { name: 'masa_tamat', label: 'Masa Tamat', type: 'time', required: true },
      { name: 'nama_pengguna', label: 'Nama Pengguna', type: 'text', required: true },
      { name: 'sekolah_unit', label: 'Sekolah / Unit', type: 'text' },
      { name: 'no_telefon', label: 'No. Telefon', type: 'tel' },
      { name: 'bilangan_peserta', label: 'Bilangan Peserta', type: 'number' },
      { name: 'tujuan', label: 'Tujuan Penggunaan', type: 'text', required: true, full: true },
      {
        name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'Ditempah',
        options: ['Ditempah', 'Selesai', 'Dibatalkan'],
      },
      { name: 'catatan', label: 'Catatan', type: 'textarea', full: true },
    ],
    columns: ['tarikh', 'masa_mula', 'bilik', 'nama_pengguna', 'tujuan', 'status'],
    searchFields: ['bilik', 'nama_pengguna', 'sekolah_unit', 'tujuan'],
    orderBy: { column: 'tarikh', ascending: false },
    statusField: 'status',
  },
  {
    key: 'opr',
    path: '/one-page-report',
    table: 'one_page_report',
    title: 'One Page Report',
    shortTitle: 'One Page Report',
    description: 'Laporan ringkas satu muka surat bagi setiap program. Boleh dicetak atau disimpan sebagai PDF.',
    icon: FileText,
    fields: [
      { name: 'tajuk_program', label: 'Tajuk Program', type: 'text', required: true, full: true },
      { name: 'tarikh', label: 'Tarikh', type: 'date', required: true },
      { name: 'tempat', label: 'Tempat', type: 'text' },
      { name: 'anjuran', label: 'Anjuran', type: 'text', defaultValue: 'USTP PPD Kunak' },
      { name: 'sasaran', label: 'Sasaran', type: 'text' },
      { name: 'bilangan_peserta', label: 'Bilangan Peserta', type: 'number' },
      { name: 'disediakan_oleh', label: 'Disediakan Oleh', type: 'text' },
      { name: 'objektif', label: 'Objektif', type: 'textarea', full: true },
      { name: 'ringkasan_aktiviti', label: 'Ringkasan Aktiviti', type: 'textarea', full: true },
      { name: 'kekuatan', label: 'Kekuatan Aktiviti', type: 'textarea', full: true },
      { name: 'impak', label: 'Impak Program', type: 'textarea', full: true },
      { name: 'cadangan', label: 'Cadangan Penambahbaikan', type: 'textarea', full: true },
      { name: 'gambar', label: 'Gambar Aktiviti (maks. 4)', type: 'images', full: true },
    ],
    columns: ['tarikh', 'tajuk_program', 'tempat', 'bilangan_peserta', 'disediakan_oleh'],
    searchFields: ['tajuk_program', 'tempat', 'disediakan_oleh'],
    orderBy: { column: 'tarikh', ascending: false },
    aiFields: ['objektif', 'kekuatan', 'impak', 'cadangan'],
  },
  {
    key: 'aset',
    path: '/pinjaman-aset',
    table: 'pinjaman_aset',
    title: 'Rekod Peminjaman Aset USTP',
    shortTitle: 'Pinjaman Aset',
    description: 'Rekod pinjaman dan pemulangan aset Unit Sumber dan Teknologi Pendidikan.',
    icon: Package,
    fields: [
      { name: 'nama_aset', label: 'Nama Aset', type: 'text', required: true },
      { name: 'no_siri', label: 'No. Siri / No. Pendaftaran Aset', type: 'text' },
      { name: 'kuantiti', label: 'Kuantiti', type: 'number', defaultValue: '1' },
      { name: 'nama_peminjam', label: 'Nama Peminjam', type: 'text', required: true },
      { name: 'sekolah_unit', label: 'Sekolah / Unit', type: 'text' },
      { name: 'no_telefon', label: 'No. Telefon', type: 'tel' },
      { name: 'tarikh_pinjam', label: 'Tarikh Pinjam', type: 'date', required: true },
      { name: 'tarikh_jangka_pulang', label: 'Tarikh Jangka Pulang', type: 'date' },
      { name: 'tarikh_pulang', label: 'Tarikh Dipulangkan', type: 'date' },
      {
        name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'Dipinjam',
        options: ['Dipinjam', 'Dipulangkan', 'Rosak / Hilang'],
      },
      { name: 'catatan', label: 'Catatan', type: 'textarea', full: true },
    ],
    columns: ['tarikh_pinjam', 'nama_aset', 'nama_peminjam', 'sekolah_unit', 'tarikh_jangka_pulang', 'status'],
    searchFields: ['nama_aset', 'no_siri', 'nama_peminjam', 'sekolah_unit'],
    orderBy: { column: 'tarikh_pinjam', ascending: false },
    statusField: 'status',
  },
  {
    key: 'arkib',
    path: '/arkib',
    table: 'arkib_dokumen',
    title: 'Arkib Kertas Kerja & Minit Mesyuarat',
    shortTitle: 'Arkib Dokumen',
    description: 'Simpanan digital kertas kerja program dan minit mesyuarat.',
    icon: Archive,
    fields: [
      {
        name: 'jenis', label: 'Jenis Dokumen', type: 'select', required: true,
        options: ['Kertas Kerja', 'Minit Mesyuarat', 'Laporan', 'Surat / Pekeliling', 'Lain-lain'],
      },
      { name: 'tarikh', label: 'Tarikh', type: 'date', required: true },
      { name: 'tajuk', label: 'Tajuk', type: 'text', required: true, full: true },
      { name: 'no_rujukan', label: 'No. Rujukan Fail', type: 'text' },
      { name: 'fail_path', label: 'Fail (PDF / Word)', type: 'file' },
      { name: 'keterangan', label: 'Keterangan', type: 'textarea', full: true },
    ],
    columns: ['tarikh', 'jenis', 'tajuk', 'no_rujukan', 'fail_path'],
    searchFields: ['tajuk', 'no_rujukan', 'keterangan'],
    orderBy: { column: 'tarikh', ascending: false },
    statusField: 'jenis',
  },
  {
    key: 'pergerakan',
    path: '/pergerakan-pegawai',
    table: 'pergerakan_pegawai',
    title: 'Rekod Pergerakan Pegawai',
    shortTitle: 'Pergerakan Pegawai',
    description: 'Rekod keluar masuk pegawai USTP untuk urusan rasmi.',
    icon: MapPin,
    fields: [
      { name: 'nama_pegawai', label: 'Nama Pegawai', type: 'text', required: true },
      { name: 'jawatan', label: 'Jawatan', type: 'text' },
      { name: 'tarikh_keluar', label: 'Tarikh Keluar', type: 'date', required: true },
      { name: 'masa_keluar', label: 'Masa Keluar', type: 'time' },
      { name: 'tarikh_kembali', label: 'Tarikh Kembali', type: 'date' },
      { name: 'masa_kembali', label: 'Masa Kembali', type: 'time' },
      { name: 'destinasi', label: 'Destinasi', type: 'text', required: true },
      {
        name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'Di luar pejabat',
        options: ['Di luar pejabat', 'Telah kembali', 'Cuti'],
      },
      { name: 'tujuan', label: 'Tujuan / Urusan', type: 'textarea', required: true, full: true },
    ],
    columns: ['tarikh_keluar', 'masa_keluar', 'nama_pegawai', 'destinasi', 'tujuan', 'status'],
    searchFields: ['nama_pegawai', 'destinasi', 'tujuan'],
    orderBy: { column: 'tarikh_keluar', ascending: false },
    statusField: 'status',
  },
]

export const moduleByKey = Object.fromEntries(modules.map((m) => [m.key, m])) as Record<string, ModuleConfig>
