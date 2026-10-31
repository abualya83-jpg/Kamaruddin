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

## Sistem Penjurian Sekolah Daerah Kunak

Sistem penjurian automatik untuk pertandingan peringkat sekolah/daerah, di laluan **`/penjurian`**.

| Peranan | Cara akses | Fungsi |
|---|---|---|
| **Super admin** | Log masuk di `/penjurian` | Luluskan / tolak / gantung permohonan admin; pantau semua pertandingan |
| **Admin pertandingan** | Mohon di `/penjurian/daftar`, guna selepas diluluskan | Cipta pertandingan: nama, rubrik, bilangan juri, pilihan iframe; urus peserta; pantau keputusan langsung |
| **Juri** | Pautan unik `/juri/<token>` (tiada akaun) | Lihat karya murid (iframe jika dipilih) dan masukkan markah ikut rubrik |
| **Umum** | `/keputusan/<id>` (jika admin hebahkan) | Papan keputusan langsung untuk skrin besar |

**Aliran:** admin cipta pertandingan → tambah peserta (atau tampal dari Excel) → hantar pautan juri (WhatsApp / kod QR) →
klik **Buka Penjurian** → juri menilai → markah masuk ke papan keputusan admin **secara realtime** →
kedudukan (Johan, Naib Johan, Tempat Ketiga) dikira automatik → **Tutup Penjurian** untuk memuktamadkan.

Markah akhir peserta = purata jumlah markah semua juri yang telah menilai. Markah sama berkongsi kedudukan.
Markah disahkan di server (fungsi `pj_juri_simpan`): setiap kriteria wajib diisi dan mesti dalam julat 0–maks.

Pautan karya YouTube, Google Drive/Docs/Slides, Canva dan Scratch ditukar secara automatik kepada format iframe.

### Setup Sistem Penjurian (sekali sahaja)

1. Jalankan `supabase/migrations/20261031000000_penjurian.sql` dalam Supabase → SQL Editor.
2. Supabase → Authentication → Sign In / Providers → hidupkan **Allow new users to sign up**
   (supaya admin pertandingan boleh mendaftar). Tetapkan juga **Site URL** dan **Redirect URLs**
   (Authentication → URL Configuration) kepada `https://ustp-ppd-kunak.vercel.app`.
3. Lantik super admin (akaun mesti sudah wujud — staf USTP sedia ada atau daftar di `/penjurian/daftar`):
   ```sql
   select public.pj_jadikan_super_admin('emel@moe.gov.my', 'Nama Pegawai');
   ```

> **Penting — keselamatan data USTP.** Kerana pendaftaran awam dibuka, migration ini mengehadkan semua jadual dan
> fail USTP kepada pengguna dalam jadual `ustp_akses`. Semua pengguna sedia ada dimasukkan secara automatik.
> Apabila menambah staf USTP baharu (Authentication → Add user), beri akses dengan:
> ```sql
> insert into public.ustp_akses (user_id) select id from auth.users where email = 'staf.baharu@moe.gov.my';
> ```

## Jalankan di komputer

```bash
npm install
cp .env.example .env.local   # isi URL & anon key Supabase
npm run dev
```

## Setup Supabase (sekali sahaja)

1. Jalankan SQL dalam `supabase/migrations/20261030000000_init.sql`
   (Supabase → SQL Editor, atau `supabase db push`). Ini mencipta 7 jadual, polisi RLS dan bucket storan `dokumen`.
   Jalankan juga migration lain dalam folder yang sama mengikut urutan nama fail.
2. Daftar pengguna: Supabase → Authentication → Users → **Add user**.
   Hanya pengguna dalam jadual `ustp_akses` boleh mengakses data USTP (lihat bahagian Sistem Penjurian).

## Deploy (Vercel)

Laman production: **https://ustp-ppd-kunak.vercel.app**

Repo ini disambung ke Vercel. Setiap push ke `main` akan deploy ke production secara automatik;
branch lain mendapat Preview URL. Tetapkan env var `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
dalam Vercel → Project → Settings → Environment Variables.

## Jana One Page Report dengan AI (Gemini)

Butang **Jana dengan AI** dalam borang One Page Report menjana Objektif, Kekuatan Aktiviti,
Impak Program dan Cadangan Penambahbaikan melalui fungsi server `api/jana-opr.ts`.

Tetapkan dalam Vercel → Project → Settings → Environment Variables (kemudian Redeploy):

| Nama | Nilai |
|---|---|
| `GEMINI_API_KEY` | API key dari https://aistudio.google.com/apikey (wajib) |
| `GEMINI_MODEL` | Pilihan. Lalai: `gemini-2.5-flash` |

Jangan sesekali letak API key dengan awalan `VITE_` kerana ia akan terdedah kepada umum dalam browser.

## Menambah / mengubah medan

Semua modul dijana daripada konfigurasi dalam `src/modules.ts`. Untuk menambah medan:
tambah lajur dalam migration SQL baru, kemudian tambah entri dalam `fields` modul berkenaan.
