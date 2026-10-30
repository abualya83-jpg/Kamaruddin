-- Skema awal: Sistem USTP PPD Kunak
-- Semua jadual hanya boleh dibaca/ditulis oleh pengguna yang log masuk.

-- 1. Guru Perpustakaan Media (GPM) Daerah Kunak
create table public.guru_perpustakaan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  sekolah text not null,
  kod_sekolah text,
  jawatan text default 'Guru Perpustakaan Media',
  no_telefon text,
  emel text,
  opsyen text,
  tahun_lantikan int,
  catatan text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- 2. Takwim USTP
create table public.takwim (
  id uuid primary key default gen_random_uuid(),
  tajuk text not null,
  tarikh_mula date not null,
  tarikh_tamat date,
  masa text,
  lokasi text,
  kategori text,
  penganjur text,
  catatan text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- 3. Rekod penggunaan bilik khas PKG
create table public.penggunaan_bilik (
  id uuid primary key default gen_random_uuid(),
  bilik text not null,
  tarikh date not null,
  masa_mula time not null,
  masa_tamat time not null,
  nama_pengguna text not null,
  sekolah_unit text,
  no_telefon text,
  tujuan text not null,
  bilangan_peserta int,
  status text not null default 'Ditempah',
  catatan text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  constraint masa_sah check (masa_tamat > masa_mula)
);

-- 4. One Page Report (OPR)
create table public.one_page_report (
  id uuid primary key default gen_random_uuid(),
  tajuk_program text not null,
  tarikh date not null,
  tempat text,
  anjuran text default 'USTP PPD Kunak',
  sasaran text,
  bilangan_peserta int,
  objektif text,
  ringkasan_aktiviti text,
  impak text,
  cadangan text,
  disediakan_oleh text,
  gambar text[] not null default '{}',
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- 5. Rekod peminjaman aset USTP
create table public.pinjaman_aset (
  id uuid primary key default gen_random_uuid(),
  nama_aset text not null,
  no_siri text,
  kuantiti int not null default 1,
  nama_peminjam text not null,
  sekolah_unit text,
  no_telefon text,
  tarikh_pinjam date not null default current_date,
  tarikh_jangka_pulang date,
  tarikh_pulang date,
  status text not null default 'Dipinjam',
  catatan text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- 6. Arkib kertas kerja & minit mesyuarat
create table public.arkib_dokumen (
  id uuid primary key default gen_random_uuid(),
  jenis text not null,
  tajuk text not null,
  tarikh date not null,
  no_rujukan text,
  keterangan text,
  fail_path text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- 7. Rekod pergerakan pegawai
create table public.pergerakan_pegawai (
  id uuid primary key default gen_random_uuid(),
  nama_pegawai text not null,
  jawatan text,
  tarikh_keluar date not null default current_date,
  masa_keluar time,
  tarikh_kembali date,
  masa_kembali time,
  destinasi text not null,
  tujuan text not null,
  status text not null default 'Di luar pejabat',
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- Row Level Security: akses penuh untuk pengguna yang log masuk sahaja
do $$
declare t text;
begin
  foreach t in array array[
    'guru_perpustakaan', 'takwim', 'penggunaan_bilik', 'one_page_report',
    'pinjaman_aset', 'arkib_dokumen', 'pergerakan_pegawai'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Pengguna log masuk boleh baca" on public.%I for select to authenticated using (true)', t);
    execute format(
      'create policy "Pengguna log masuk boleh tambah" on public.%I for insert to authenticated with check (true)', t);
    execute format(
      'create policy "Pengguna log masuk boleh kemas kini" on public.%I for update to authenticated using (true) with check (true)', t);
    execute format(
      'create policy "Pengguna log masuk boleh padam" on public.%I for delete to authenticated using (true)', t);
  end loop;
end $$;

-- Storan fail (dokumen arkib & gambar OPR) — bucket peribadi
insert into storage.buckets (id, name, public)
values ('dokumen', 'dokumen', false)
on conflict (id) do nothing;

create policy "Pengguna log masuk boleh baca fail"
  on storage.objects for select to authenticated using (bucket_id = 'dokumen');
create policy "Pengguna log masuk boleh muat naik fail"
  on storage.objects for insert to authenticated with check (bucket_id = 'dokumen');
create policy "Pengguna log masuk boleh padam fail"
  on storage.objects for delete to authenticated using (bucket_id = 'dokumen');
