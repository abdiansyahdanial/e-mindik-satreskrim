-- ==============================================================================
-- SKEMA DATABASE E-MINDIK SATRESKRIM POLRES KOLAKA TIMUR
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda:
-- https://supabase.com/dashboard/project/ncsjgjftybxpxuixgumm/sql
-- ==============================================================================

-- 1. TABEL PROFILES (PENGGUNA & PERAN: super_admin vs admin)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nama TEXT NOT NULL DEFAULT 'Penyidik Satreskrim',
    pangkat TEXT DEFAULT 'BRIPKA',
    nrp TEXT DEFAULT '00000000',
    jabatan TEXT DEFAULT 'Penyidik Pembantu',
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')) DEFAULT 'admin',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan RLS untuk profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (true);

-- 2. TABEL INVESTIGATORS (PERSONEL PENYIDIK SATRESKRIM)
CREATE TABLE IF NOT EXISTS public.investigators (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nama TEXT NOT NULL,
    pangkat TEXT NOT NULL,
    nrp TEXT NOT NULL UNIQUE,
    jabatan TEXT NOT NULL,
    role TEXT DEFAULT 'Penyidik',
    phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'standby', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.investigators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Investigators are viewable by all users" ON public.investigators;
CREATE POLICY "Investigators are viewable by all users" 
ON public.investigators FOR SELECT USING (true);

DROP POLICY IF EXISTS "Investigators can be created by all" ON public.investigators;
CREATE POLICY "Investigators can be created by all" 
ON public.investigators FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Investigators can be updated by all" ON public.investigators;
CREATE POLICY "Investigators can be updated by all" 
ON public.investigators FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Investigators can be deleted by all" ON public.investigators;
CREATE POLICY "Investigators can be deleted by all" 
ON public.investigators FOR DELETE USING (true);

-- 3. TABEL CASES (BERKAS PERKARA PIDANA / LAPORAN POLISI)
CREATE TABLE IF NOT EXISTS public.cases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    no_lp TEXT NOT NULL UNIQUE,
    tindak_pidana TEXT NOT NULL,
    pasal_uu TEXT NOT NULL,
    pasal TEXT,
    locus TEXT NOT NULL,
    tempus TEXT NOT NULL,
    pelapor_name TEXT NOT NULL,
    terlapor_name TEXT,
    sprin_val_date TEXT DEFAULT '30 hari',
    sprin_loc TEXT DEFAULT 'Kolaka Timur',
    sprin_date TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    investigators JSONB DEFAULT '[]'::jsonb,
    person JSONB DEFAULT '{}'::jsonb,
    references JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cases are viewable by all users" ON public.cases;
CREATE POLICY "Cases are viewable by all users" 
ON public.cases FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cases can be created by all users" ON public.cases;
CREATE POLICY "Cases can be created by all users" 
ON public.cases FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Cases can be updated by all users" ON public.cases;
CREATE POLICY "Cases can be updated by all users" 
ON public.cases FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Cases can be deleted by all users" ON public.cases;
CREATE POLICY "Cases can be deleted by all users" 
ON public.cases FOR DELETE USING (true);

-- 4. TABEL DOCUMENT_TEMPLATES (TEMPLATE MASTER MINDIK)
CREATE TABLE IF NOT EXISTS public.document_templates (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'SURAT PERINTAH',
    file_path TEXT,
    file_url TEXT,
    description TEXT,
    dynamic_fields JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pastikan kolom file_url ada jika tabel sudah dibuat sebelumnya
ALTER TABLE public.document_templates ADD COLUMN IF NOT EXISTS file_url TEXT;

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Templates are viewable by all" ON public.document_templates;
CREATE POLICY "Templates are viewable by all" 
ON public.document_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Templates can be inserted by all" ON public.document_templates;
CREATE POLICY "Templates can be inserted by all" 
ON public.document_templates FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Templates can be updated by all" ON public.document_templates;
CREATE POLICY "Templates can be updated by all" 
ON public.document_templates FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Templates can be deleted by all" ON public.document_templates;
CREATE POLICY "Templates can be deleted by all" 
ON public.document_templates FOR DELETE USING (true);

-- 5. KONFIGURASI STORAGE BUCKET 'docx-templates'
INSERT INTO storage.buckets (id, name, public)
VALUES ('docx-templates', 'docx-templates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read docx-templates" ON storage.objects;
CREATE POLICY "Public Read docx-templates" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'docx-templates');

DROP POLICY IF EXISTS "Allow Upload docx-templates" ON storage.objects;
CREATE POLICY "Allow Upload docx-templates" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'docx-templates');

DROP POLICY IF EXISTS "Allow Update docx-templates" ON storage.objects;
CREATE POLICY "Allow Update docx-templates" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'docx-templates');

DROP POLICY IF EXISTS "Allow Delete docx-templates" ON storage.objects;
CREATE POLICY "Allow Delete docx-templates" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'docx-templates');

-- ==============================================================================
-- 6. SEED DATA AWAL PERSONEL INVESTIGATORS
-- ==============================================================================
INSERT INTO public.investigators (id, nama, pangkat, nrp, jabatan, role, phone, status)
VALUES
  ('usr-001', 'AKP AHMAD FATONI, S.H.', 'AKP', '78120567', 'Kepala Satuan Reserse Kriminal', 'Kasat', '081234567890', 'active'),
  ('usr-002', 'IPDA KURNIAWAN, S.Tr.K.', 'IPDA', '94050211', 'Kaur Bin Ops Satreskrim', 'KBO', '081234567891', 'active'),
  ('usr-003', 'AIPTU ANDI FIRMANSYAH', 'AIPTU', '80040812', 'Kanit 1 Pidum', 'Kanit', '081234567892', 'active'),
  ('usr-004', 'AIPDA RAHMAT HIDAYAT', 'AIPDA', '83090123', 'Kanit 2 Tipidter', 'Kanit', '081234567893', 'active'),
  ('usr-005', 'BRIPKA DEDI PRASETYO, S.H.', 'BRIPKA', '88110543', 'Penyidik Pembantu Unit 1', 'Penyidik', '081234567894', 'active'),
  ('usr-006', 'BRIPKA ILHAM WAHYUDI', 'BRIPKA', '89030221', 'Penyidik Pembantu Unit 1', 'Penyidik', '081234567895', 'active'),
  ('usr-007', 'BRIGADIR FAJAR MAULANA', 'BRIGADIR', '92070444', 'Penyidik Pembantu Unit 2', 'Penyidik', '081234567896', 'standby'),
  ('usr-008', 'BRIPTU MUHAMMAD RIZKY', 'BRIPTU', '96080987', 'Bintara Administrasi Penyidikan', 'Banum', '081234567897', 'active')
ON CONFLICT (nrp) DO UPDATE SET
  nama = EXCLUDED.nama,
  pangkat = EXCLUDED.pangkat,
  jabatan = EXCLUDED.jabatan,
  phone = EXCLUDED.phone;

-- ==============================================================================
-- 7. SEED DATA AWAL BERKAS PERKARA
-- ==============================================================================
INSERT INTO public.cases (id, no_lp, tindak_pidana, pasal_uu, pasal, locus, tempus, pelapor_name, terlapor_name, sprin_val_date, sprin_loc, sprin_date, status, investigators, person, references)
VALUES
  (
    'case-001',
    'LP/B/24/VIII/2026/SPKT/POLRES KOLAKA TIMUR',
    'Pencurian dengan Pemberatan',
    'Pasal 363 ayat (1) ke-3 dan ke-4 KUHP',
    'Pasal 363 KUHP tentang Pencurian dengan Pemberatan',
    'Desa Lalingato, Kec. Tirawuta, Kab. Kolaka Timur',
    '15 Agustus 2026, Pukul 02.30 WITA',
    'I Made Suardana',
    'Wayan Agus Setiawan',
    '30 (tiga puluh) hari',
    'Tirawuta',
    '2026-08-16',
    'active',
    '[{"user_id": "usr-005", "role_order": 1, "nama": "BRIPKA DEDI PRASETYO, S.H.", "pangkat": "BRIPKA", "nrp": "88110543", "jabatan": "Penyidik Pembantu"}, {"user_id": "usr-006", "role_order": 2, "nama": "BRIPKA ILHAM WAHYUDI", "pangkat": "BRIPKA", "nrp": "89030221", "jabatan": "Penyidik Pembantu"}]'::jsonb,
    '{"nik": "7405021204850002", "nama": "Wayan Agus Setiawan", "umur": "38 Tahun", "agama": "Hindu", "gender": "Laki-laki", "alamat": "Dusun II, Desa Lalingato, Kec. Tirawuta, Kab. Kolaka Timur", "pob_dob": "Lalingato, 12 April 1988", "pekerjaan": "Petani / Pekebun", "pendidikan": "SMA", "marital_status": "Kawin", "kewarganegaraan": "Indonesia"}'::jsonb,
    '{"no_spdp": "B/24/VIII/2026/Reskrim", "no_sprin_kap": "Sp.Kap/18/VIII/2026/Reskrim", "no_sprin_han": "Sp.Han/14/VIII/2026/Reskrim", "no_sp_tap_tsk": "S.Tap/12/VIII/2026/Reskrim", "no_sprin_gas": "Sp.Gas/30/VIII/2026/Reskrim", "no_sprin_sidik": "Sp.Sidik/35/VIII/2026/Reskrim"}'::jsonb
  ),
  (
    'case-002',
    'LP/B/28/VIII/2026/SPKT/POLRES KOLAKA TIMUR',
    'Penipuan dan Penggelapan Hasil Panen Sawit',
    'Pasal 378 dan Pasal 372 KUHP',
    'Pasal 378 Jo Pasal 372 KUHP tentang Penipuan dan Penggelapan',
    'Kec. Ladongi, Kab. Kolaka Timur',
    '20 Agustus 2026, Pukul 10.00 WITA',
    'Haji Baharuddin',
    'Lukman Syahputra',
    '30 (tiga puluh) hari',
    'Tirawuta',
    '2026-08-21',
    'active',
    '[{"user_id": "usr-005", "role_order": 1, "nama": "BRIPKA DEDI PRASETYO, S.H.", "pangkat": "BRIPKA", "nrp": "88110543", "jabatan": "Penyidik Pembantu"}]'::jsonb,
    '{"nik": "7405031908820001", "nama": "Lukman Syahputra", "umur": "44 Tahun", "agama": "Islam", "gender": "Laki-laki", "alamat": "Kel. Ladongi Jaya, Kec. Ladongi, Kab. Kolaka Timur", "pob_dob": "Kendari, 19 Agustus 1982", "pekerjaan": "Pedagang", "pendidikan": "S1", "marital_status": "Kawin", "kewarganegaraan": "Indonesia"}'::jsonb,
    '{"no_spdp": "B/28/VIII/2026/Reskrim", "no_sprin_kap": "", "no_sprin_han": "", "no_sp_tap_tsk": "S.Tap/15/VIII/2026/Reskrim", "no_sprin_gas": "Sp.Gas/34/VIII/2026/Reskrim", "no_sprin_sidik": "Sp.Sidik/39/VIII/2026/Reskrim"}'::jsonb
  )
ON CONFLICT (no_lp) DO NOTHING;

-- ==============================================================================
-- 8. TABEL CASE_SUSPECTS (MULTI-TERSANGKA & RIWAYAT SURAT PERORANGAN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.case_suspects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    nik TEXT,
    jenis_kelamin TEXT DEFAULT 'Laki-laki',
    tempat_lahir TEXT,
    tgl_lahir TEXT,
    umur TEXT,
    agama TEXT DEFAULT 'Islam',
    pekerjaan TEXT DEFAULT 'Swasta',
    kewarganegaraan TEXT DEFAULT 'Indonesia',
    pendidikan TEXT DEFAULT 'SMA',
    status_pernikahan TEXT DEFAULT 'Kawin',
    alamat TEXT,
    status TEXT DEFAULT 'tersangka' CHECK (status IN ('terlapor', 'tersangka')),
    -- Riwayat Rujukan Surat Perorangan
    no_sp_tap_tsk TEXT,
    no_sprin_kap TEXT,
    no_sprin_han TEXT,
    no_panjang_han_kn TEXT,
    no_sprin_han_kn TEXT,
    no_tap_han_pn_1 TEXT,
    no_sprin_han_pn_1 TEXT,
    no_tap_han_pn_2 TEXT,
    no_sprin_han_pn_2 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.case_suspects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Case suspects are viewable by all users" ON public.case_suspects;
CREATE POLICY "Case suspects are viewable by all users" 
ON public.case_suspects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Case suspects can be inserted by all users" ON public.case_suspects;
CREATE POLICY "Case suspects can be inserted by all users" 
ON public.case_suspects FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Case suspects can be updated by all users" ON public.case_suspects;
CREATE POLICY "Case suspects can be updated by all users" 
ON public.case_suspects FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Case suspects can be deleted by all users" ON public.case_suspects;
CREATE POLICY "Case suspects can be deleted by all users" 
ON public.case_suspects FOR DELETE USING (true);

-- ==============================================================================
-- 9. MIGRASI KOLOM TABEL CASES & CASE_SUSPECTS
-- ==============================================================================
ALTER TABLE public.case_suspects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'tersangka' CHECK (status IN ('terlapor', 'tersangka'));
ALTER TABLE public.case_suspects ADD COLUMN IF NOT EXISTS nomor_sp_tap TEXT;
ALTER TABLE public.case_suspects ADD COLUMN IF NOT EXISTS tanggal_sp_tap TEXT;
ALTER TABLE public.case_suspects ADD COLUMN IF NOT EXISTS tgl_sp_tap_tsk TEXT;

-- Sinkronisasi no_sp_tap_tsk dan nomor_sp_tap jika salah satu terisi
UPDATE public.case_suspects SET nomor_sp_tap = no_sp_tap_tsk WHERE nomor_sp_tap IS NULL AND no_sp_tap_tsk IS NOT NULL;
UPDATE public.case_suspects SET no_sp_tap_tsk = nomor_sp_tap WHERE no_sp_tap_tsk IS NULL AND nomor_sp_tap IS NOT NULL;
UPDATE public.case_suspects SET tanggal_sp_tap = tgl_sp_tap_tsk WHERE tanggal_sp_tap IS NULL AND tgl_sp_tap_tsk IS NOT NULL;
UPDATE public.case_suspects SET tgl_sp_tap_tsk = tanggal_sp_tap WHERE tgl_sp_tap_tsk IS NULL AND tanggal_sp_tap IS NOT NULL;

ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS nomor_lp TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS tanggal_lp TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS nama_pelapor TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS nama_terlapor TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS dasar_pasal_uu TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS no_sprin_sidik TEXT DEFAULT NULL;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS no_spdp TEXT DEFAULT NULL;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS no_p21_kn TEXT DEFAULT NULL;

-- Sync nomor_lp dari no_lp yang sudah ada
UPDATE public.cases SET nomor_lp = no_lp WHERE nomor_lp IS NULL;
UPDATE public.cases SET nama_pelapor = pelapor_name WHERE nama_pelapor IS NULL;
UPDATE public.cases SET nama_terlapor = terlapor_name WHERE nama_terlapor IS NULL;
UPDATE public.cases SET dasar_pasal_uu = pasal_uu WHERE dasar_pasal_uu IS NULL;

-- Seed data awal tersangka untuk case-001 & case-002
INSERT INTO public.case_suspects (
  id, case_id, nama, nik, jenis_kelamin, tempat_lahir, tgl_lahir, umur,
  agama, pekerjaan, kewarganegaraan, pendidikan, status_pernikahan, alamat,
  status, no_sp_tap_tsk, no_sprin_kap, no_sprin_han
)
VALUES
  (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'case-001',
    'Wayan Agus Setiawan',
    '7405021204850002',
    'Laki-laki',
    'Lalingato',
    '12 April 1988',
    '38',
    'Hindu',
    'Petani / Pekebun',
    'Indonesia',
    'SMA',
    'Kawin',
    'Dusun II, Desa Lalingato, Kec. Tirawuta, Kab. Kolaka Timur',
    'tersangka',
    'S.Tap/12/VIII/2026/Reskrim',
    'Sp.Kap/18/VIII/2026/Reskrim',
    'Sp.Han/14/VIII/2026/Reskrim'
  ),
  (
    'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e',
    'case-002',
    'Lukman Syahputra',
    '7405031908820001',
    'Laki-laki',
    'Kendari',
    '19 Agustus 1982',
    '44',
    'Islam',
    'Pedagang',
    'Indonesia',
    'S1',
    'Kawin',
    'Kel. Ladongi Jaya, Kec. Ladongi, Kab. Kolaka Timur',
    'tersangka',
    'S.Tap/15/VIII/2026/Reskrim',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

