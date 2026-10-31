-- =====================================================================
-- Sistem Penjurian Sekolah Daerah Kunak
--   * Super admin meluluskan permohonan admin pertandingan
--   * Admin pertandingan mencipta pertandingan, rubrik, juri & peserta
--   * Juri memasukkan markah melalui pautan unik (tanpa akaun)
--   * Markah dihantar ke admin secara realtime (Supabase Realtime)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Lindungi data USTP sedia ada.
--    Pendaftaran akaun awam perlu dibuka untuk admin pertandingan, jadi
--    jadual USTP kini hanya untuk pengguna dalam senarai `ustp_akses`.
--    Semua pengguna sedia ada dimasukkan secara automatik.
-- ---------------------------------------------------------------------
create table public.ustp_akses (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
insert into public.ustp_akses (user_id) select id from auth.users on conflict do nothing;
alter table public.ustp_akses enable row level security;
create policy "Pengguna lihat akses sendiri" on public.ustp_akses
  for select to authenticated using (user_id = auth.uid());

create or replace function public.ustp_ada_akses()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ustp_akses where user_id = auth.uid());
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'guru_perpustakaan', 'takwim', 'penggunaan_bilik', 'one_page_report',
    'pinjaman_aset', 'arkib_dokumen', 'pergerakan_pegawai'
  ] loop
    execute format('drop policy if exists "Pengguna log masuk boleh baca" on public.%I', t);
    execute format('drop policy if exists "Pengguna log masuk boleh tambah" on public.%I', t);
    execute format('drop policy if exists "Pengguna log masuk boleh kemas kini" on public.%I', t);
    execute format('drop policy if exists "Pengguna log masuk boleh padam" on public.%I', t);
    execute format(
      'create policy "Staf USTP boleh baca" on public.%I for select to authenticated using (public.ustp_ada_akses())', t);
    execute format(
      'create policy "Staf USTP boleh tambah" on public.%I for insert to authenticated with check (public.ustp_ada_akses())', t);
    execute format(
      'create policy "Staf USTP boleh kemas kini" on public.%I for update to authenticated using (public.ustp_ada_akses()) with check (public.ustp_ada_akses())', t);
    execute format(
      'create policy "Staf USTP boleh padam" on public.%I for delete to authenticated using (public.ustp_ada_akses())', t);
  end loop;
end $$;

drop policy if exists "Pengguna log masuk boleh baca fail" on storage.objects;
drop policy if exists "Pengguna log masuk boleh muat naik fail" on storage.objects;
drop policy if exists "Pengguna log masuk boleh padam fail" on storage.objects;
create policy "Staf USTP boleh baca fail" on storage.objects
  for select to authenticated using (bucket_id = 'dokumen' and public.ustp_ada_akses());
create policy "Staf USTP boleh muat naik fail" on storage.objects
  for insert to authenticated with check (bucket_id = 'dokumen' and public.ustp_ada_akses());
create policy "Staf USTP boleh padam fail" on storage.objects
  for delete to authenticated using (bucket_id = 'dokumen' and public.ustp_ada_akses());

-- ---------------------------------------------------------------------
-- 1. Profil pengguna sistem penjurian
-- ---------------------------------------------------------------------
create table public.pj_profil (
  id uuid primary key references auth.users on delete cascade,
  nama text not null,
  emel text not null,
  sekolah text,
  jawatan text,
  no_telefon text,
  tujuan text,
  peranan text not null default 'admin' check (peranan in ('super_admin', 'admin')),
  status text not null default 'menunggu' check (status in ('menunggu', 'diluluskan', 'ditolak', 'digantung')),
  catatan_kelulusan text,
  disemak_oleh uuid references auth.users on delete set null,
  disemak_pada timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.pj_is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pj_profil
    where id = auth.uid() and peranan = 'super_admin' and status = 'diluluskan');
$$;

create or replace function public.pj_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pj_profil where id = auth.uid() and status = 'diluluskan');
$$;

alter table public.pj_profil enable row level security;
create policy "Lihat profil sendiri / super admin" on public.pj_profil
  for select to authenticated using (id = auth.uid() or public.pj_is_super());
-- Pengguna log masuk (cth. staf USTP) boleh memohon sendiri; nilai peranan/status dikunci.
create policy "Mohon sebagai admin" on public.pj_profil
  for insert to authenticated
  with check (id = auth.uid() and peranan = 'admin' and status = 'menunggu'
              and disemak_oleh is null and disemak_pada is null);
create policy "Super admin kemas kini profil" on public.pj_profil
  for update to authenticated using (public.pj_is_super()) with check (public.pj_is_super());
create policy "Super admin padam profil" on public.pj_profil
  for delete to authenticated using (public.pj_is_super() and id <> auth.uid());

-- Cipta profil "menunggu" secara automatik apabila mendaftar melalui borang penjurian.
create or replace function public.pj_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data ->> 'app' = 'penjurian' then
    insert into public.pj_profil (id, nama, emel, sekolah, jawatan, no_telefon, tujuan)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'nama', ''), new.email),
      new.email,
      new.raw_user_meta_data ->> 'sekolah',
      new.raw_user_meta_data ->> 'jawatan',
      new.raw_user_meta_data ->> 'no_telefon',
      new.raw_user_meta_data ->> 'tujuan')
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create trigger pj_on_auth_user_created
  after insert on auth.users
  for each row execute function public.pj_handle_new_user();

-- Untuk dijalankan oleh pentadbir dalam SQL Editor sahaja (bukan dari browser).
create or replace function public.pj_jadikan_super_admin(p_emel text, p_nama text default null)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_emel);
  if uid is null then
    return 'Tiada akaun dengan e-mel ' || p_emel || '. Daftar akaun dahulu.';
  end if;
  insert into public.pj_profil (id, nama, emel, peranan, status, disemak_pada)
  values (uid, coalesce(p_nama, p_emel), p_emel, 'super_admin', 'diluluskan', now())
  on conflict (id) do update set peranan = 'super_admin', status = 'diluluskan', disemak_pada = now();
  return p_emel || ' kini super admin.';
end $$;
revoke all on function public.pj_jadikan_super_admin(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Pertandingan, juri, peserta & markah
-- ---------------------------------------------------------------------
create table public.pj_pertandingan (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null default auth.uid() references public.pj_profil on delete cascade,
  nama text not null,
  keterangan text,
  kategori text,
  tarikh date,
  tempat text,
  -- [{ "id": "k1", "kriteria": "Kreativiti", "keterangan": "...", "maks": 20 }]
  rubrik jsonb not null default '[]'::jsonb check (jsonb_typeof(rubrik) = 'array'),
  bilangan_juri int not null default 3 check (bilangan_juri between 1 and 20),
  guna_iframe boolean not null default false,
  status text not null default 'draf' check (status in ('draf', 'dibuka', 'ditutup')),
  keputusan_umum boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.pj_juri (
  id uuid primary key default gen_random_uuid(),
  pertandingan_id uuid not null references public.pj_pertandingan on delete cascade,
  nombor int not null,
  nama text,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  unique (pertandingan_id, nombor)
);

create table public.pj_peserta (
  id uuid primary key default gen_random_uuid(),
  pertandingan_id uuid not null references public.pj_pertandingan on delete cascade,
  no_peserta text,
  nama_peserta text not null,
  sekolah text,
  tajuk_karya text,
  pautan_karya text,
  catatan text,
  created_at timestamptz not null default now()
);

create table public.pj_markah (
  id uuid primary key default gen_random_uuid(),
  pertandingan_id uuid not null references public.pj_pertandingan on delete cascade,
  juri_id uuid not null references public.pj_juri on delete cascade,
  peserta_id uuid not null references public.pj_peserta on delete cascade,
  markah jsonb not null default '{}'::jsonb,
  jumlah numeric not null default 0,
  ulasan text,
  updated_at timestamptz not null default now(),
  unique (juri_id, peserta_id)
);

create index pj_pertandingan_admin_idx on public.pj_pertandingan (admin_id);
create index pj_juri_pertandingan_idx on public.pj_juri (pertandingan_id);
create index pj_peserta_pertandingan_idx on public.pj_peserta (pertandingan_id);
create index pj_markah_pertandingan_idx on public.pj_markah (pertandingan_id);

create or replace function public.pj_milik(p_pertandingan uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pj_pertandingan p
    join public.pj_profil a on a.id = p.admin_id
    where p.id = p_pertandingan and p.admin_id = auth.uid() and a.status = 'diluluskan');
$$;

alter table public.pj_pertandingan enable row level security;
alter table public.pj_juri enable row level security;
alter table public.pj_peserta enable row level security;
alter table public.pj_markah enable row level security;

create policy "Admin/super lihat pertandingan" on public.pj_pertandingan
  for select to authenticated using (public.pj_milik(id) or public.pj_is_super());
create policy "Admin diluluskan cipta pertandingan" on public.pj_pertandingan
  for insert to authenticated with check (admin_id = auth.uid() and public.pj_is_admin());
create policy "Admin kemas kini pertandingan" on public.pj_pertandingan
  for update to authenticated using (public.pj_milik(id)) with check (admin_id = auth.uid());
create policy "Admin/super padam pertandingan" on public.pj_pertandingan
  for delete to authenticated using (public.pj_milik(id) or public.pj_is_super());

create policy "Admin/super lihat juri" on public.pj_juri
  for select to authenticated using (public.pj_milik(pertandingan_id) or public.pj_is_super());
create policy "Admin urus juri" on public.pj_juri
  for all to authenticated using (public.pj_milik(pertandingan_id)) with check (public.pj_milik(pertandingan_id));

create policy "Admin/super lihat peserta" on public.pj_peserta
  for select to authenticated using (public.pj_milik(pertandingan_id) or public.pj_is_super());
create policy "Admin urus peserta" on public.pj_peserta
  for all to authenticated using (public.pj_milik(pertandingan_id)) with check (public.pj_milik(pertandingan_id));

-- Markah hanya ditulis melalui fungsi juri (pj_juri_simpan). Admin boleh lihat & padam.
create policy "Admin/super lihat markah" on public.pj_markah
  for select to authenticated using (public.pj_milik(pertandingan_id) or public.pj_is_super());
create policy "Admin padam markah" on public.pj_markah
  for delete to authenticated using (public.pj_milik(pertandingan_id));

-- Selaraskan slot juri dengan bilangan_juri (tambah slot baharu; buang slot berlebihan).
create or replace function public.pj_selaras_juri()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pj_juri (pertandingan_id, nombor, nama)
  select new.id, n, 'Juri ' || n from generate_series(1, new.bilangan_juri) n
  on conflict (pertandingan_id, nombor) do nothing;
  delete from public.pj_juri where pertandingan_id = new.id and nombor > new.bilangan_juri;
  return new;
end $$;

create trigger pj_pertandingan_selaras_juri
  after insert or update of bilangan_juri on public.pj_pertandingan
  for each row execute function public.pj_selaras_juri();

-- ---------------------------------------------------------------------
-- 3. Fungsi untuk juri (akses melalui token, tanpa log masuk)
-- ---------------------------------------------------------------------
create or replace function public.pj_juri_data(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare j public.pj_juri; p public.pj_pertandingan;
begin
  select * into j from public.pj_juri where token = p_token;
  if not found then return null; end if;
  select * into p from public.pj_pertandingan where id = j.pertandingan_id;
  return jsonb_build_object(
    'juri', jsonb_build_object('id', j.id, 'nombor', j.nombor, 'nama', j.nama),
    'pertandingan', jsonb_build_object(
      'id', p.id, 'nama', p.nama, 'keterangan', p.keterangan, 'kategori', p.kategori,
      'tarikh', p.tarikh, 'tempat', p.tempat, 'rubrik', p.rubrik,
      'guna_iframe', p.guna_iframe, 'status', p.status),
    'peserta', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'no_peserta', s.no_peserta, 'nama_peserta', s.nama_peserta,
        'sekolah', s.sekolah, 'tajuk_karya', s.tajuk_karya, 'pautan_karya', s.pautan_karya)
        order by s.no_peserta nulls last, s.created_at)
      from public.pj_peserta s where s.pertandingan_id = p.id), '[]'::jsonb),
    'markah', coalesce((
      select jsonb_agg(jsonb_build_object(
        'peserta_id', m.peserta_id, 'markah', m.markah, 'jumlah', m.jumlah,
        'ulasan', m.ulasan, 'updated_at', m.updated_at))
      from public.pj_markah m where m.juri_id = j.id), '[]'::jsonb));
end $$;

create or replace function public.pj_juri_simpan(
  p_token text, p_peserta uuid, p_markah jsonb, p_ulasan text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  j public.pj_juri; p public.pj_pertandingan;
  k jsonb; v numeric; jumlah numeric := 0; bersih jsonb := '{}'::jsonb;
begin
  select * into j from public.pj_juri where token = p_token;
  if not found then raise exception 'Pautan juri tidak sah.'; end if;
  select * into p from public.pj_pertandingan where id = j.pertandingan_id;
  if p.status <> 'dibuka' then raise exception 'Penjurian tidak dibuka.'; end if;
  if not exists (select 1 from public.pj_peserta where id = p_peserta and pertandingan_id = p.id) then
    raise exception 'Peserta tidak sah.';
  end if;

  for k in select * from jsonb_array_elements(p.rubrik) loop
    if coalesce(jsonb_typeof(p_markah -> (k ->> 'id')), '') <> 'number' then
      raise exception 'Sila isi markah untuk kriteria "%".', k ->> 'kriteria';
    end if;
    v := (p_markah ->> (k ->> 'id'))::numeric;
    if v < 0 or v > (k ->> 'maks')::numeric then
      raise exception 'Markah "%" mesti antara 0 dan %.', k ->> 'kriteria', k ->> 'maks';
    end if;
    bersih := bersih || jsonb_build_object(k ->> 'id', v);
    jumlah := jumlah + v;
  end loop;

  insert into public.pj_markah (pertandingan_id, juri_id, peserta_id, markah, jumlah, ulasan, updated_at)
  values (p.id, j.id, p_peserta, bersih, jumlah, nullif(trim(p_ulasan), ''), now())
  on conflict (juri_id, peserta_id) do update
    set markah = excluded.markah, jumlah = excluded.jumlah,
        ulasan = excluded.ulasan, updated_at = now();

  return jsonb_build_object('peserta_id', p_peserta, 'markah', bersih, 'jumlah', jumlah);
end $$;

-- Keputusan umum (hanya jika admin menghebahkan). Tiada identiti juri didedahkan.
create or replace function public.pj_keputusan_umum(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.pj_pertandingan;
begin
  select * into p from public.pj_pertandingan where id = p_id and keputusan_umum;
  if not found then return null; end if;
  return jsonb_build_object(
    'pertandingan', jsonb_build_object(
      'id', p.id, 'nama', p.nama, 'keterangan', p.keterangan, 'kategori', p.kategori,
      'tarikh', p.tarikh, 'tempat', p.tempat, 'rubrik', p.rubrik,
      'bilangan_juri', p.bilangan_juri, 'status', p.status),
    'peserta', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'no_peserta', s.no_peserta, 'nama_peserta', s.nama_peserta,
        'sekolah', s.sekolah, 'tajuk_karya', s.tajuk_karya))
      from public.pj_peserta s where s.pertandingan_id = p.id), '[]'::jsonb),
    'markah', coalesce((
      select jsonb_agg(jsonb_build_object(
        'peserta_id', m.peserta_id, 'juri_id', m.juri_id, 'jumlah', m.jumlah))
      from public.pj_markah m where m.pertandingan_id = p.id), '[]'::jsonb));
end $$;

grant execute on function public.pj_juri_data(text) to anon, authenticated;
grant execute on function public.pj_juri_simpan(text, uuid, jsonb, text) to anon, authenticated;
grant execute on function public.pj_keputusan_umum(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Realtime: admin menerima markah sebaik juri menyimpan
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.pj_markah;
    alter publication supabase_realtime add table public.pj_profil;
  end if;
end $$;
