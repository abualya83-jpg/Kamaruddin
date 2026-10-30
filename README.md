# Sistem USTP PPD Kunak

Web app Unit Sumber dan Teknologi Pendidikan (USTP), Pejabat Pendidikan Daerah Kunak.

**Stack:** React + Vite + TypeScript · Tailwind CSS · Supabase (database, login, storan fail) · Vercel (hosting)

## Modul

| # | Modul | Jadual Supabase |
|---|---|---|
| 1 | Maklumat Guru Perpustakaan Media Daerah Kunak | `guru_perpustakaan` |
| 2 | Takwim USTP (paparan kalendar + senarai) | `takwim` |
| 3 | Rekod penggunaan bilik khas PKG | `penggunaan_bilik` |
| 4 | One Page Report (dengan gambar, boleh cetak / PDF) | `one_page_report` |
| 5 | Rekod peminjaman aset USTP | `pinjaman_aset` |
| 6 | Arkib kertas kerja & minit mesyuarat (muat naik fail) | `arkib_dokumen` |
| 7 | Rekod pergerakan pegawai | `pergerakan_pegawai` |

Dashboard memaparkan program akan datang, tempahan bilik hari ini, pegawai di luar pejabat dan aset lewat dipulangkan.

## Jalankan di komputer

```bash
npm install
cp .env.example .env.local   # isi URL & anon key Supabase
npm run dev
```

## Setup Supabase (sekali sahaja)

1. Jalankan SQL dalam `supabase/migrations/20261030000000_init.sql`
   (Supabase → SQL Editor, atau `supabase db push`). Ini mencipta 7 jadual, polisi RLS dan bucket storan `dokumen`.
2. Daftar pengguna: Supabase → Authentication → Users → **Add user**.
   Hanya pengguna yang didaftarkan boleh log masuk dan mengakses data.

## Deploy (Vercel)

Sambungkan repo ini ke Vercel. Setiap push ke `main` akan deploy ke production secara automatik;
branch lain mendapat Preview URL. Tetapkan env var `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
dalam Vercel → Project → Settings → Environment Variables.

## Menambah / mengubah medan

Semua modul dijana daripada konfigurasi dalam `src/modules.ts`. Untuk menambah medan:
tambah lajur dalam migration SQL baru, kemudian tambah entri dalam `fields` modul berkenaan.
