-- ============================================================================
-- MIT-WEEK 2026 Competition Management System
-- Migration 002: Phase 3 Contestant Features
-- 1.1 Juknis link in competition_settings
-- 1.2 Case study table with RLS & initial seed
-- 1.3 Submission receipt (first_submitted_at) & link_check columns + triggers
-- 1.4 Finalist notice table, RLS, and secure RPC function
-- ============================================================================

-- ============================================================================
-- 1.1 JUKNIS LINK
-- ============================================================================
ALTER TABLE public.competition_settings
  ADD COLUMN juknis_url TEXT;

ALTER TABLE public.competition_settings
  ADD CONSTRAINT competition_settings_juknis_url_check
  CHECK (juknis_url IS NULL OR juknis_url ~* '^https://');

-- Catatan: Policy "Authenticated read settings" sudah ada di migrasi 001,
-- sehingga semua role yang terautentikasi (admin, judge, team) sudah bisa membaca juknis_url.


-- ============================================================================
-- 1.2 CASE STUDY (Single-row table)
-- ============================================================================
CREATE TABLE public.case_study (
  id         BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  title      TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL DEFAULT '',
  release_at TIMESTAMPTZ,            -- NULL = langsung terlihat
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.case_study ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_case_study_touch
BEFORE UPDATE ON public.case_study
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Admin full access case_study" ON public.case_study
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Judges read case_study" ON public.case_study
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'judge');

CREATE POLICY "Teams read case_study when released" ON public.case_study
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'team'
    AND (release_at IS NULL OR release_at <= NOW())
  );

-- Seed initial case study (Appendix A)
INSERT INTO public.case_study (id, title, content_md, release_at)
VALUES (
  TRUE,
  'Trust Trap: Should You Trust It?',
  $md$## Latar Belakang

Pengguna muda semakin sering menghadapi berbagai interaksi digital, seperti pesan atau tawaran mencurigakan, permintaan transfer uang yang tidak terduga, dan tautan yang berpotensi mengarah pada penipuan. Tidak selalu mudah untuk menentukan apakah suatu interaksi dapat dipercaya, terutama ketika informasi yang tersedia terbatas atau pengguna dihadapkan pada situasi yang mendesak.

## Tantangan

Peserta ditantang untuk mengembangkan solusi berbasis web yang membantu pengguna muda menilai interaksi digital mencurigakan yang mereka temui, mengambil keputusan berdasarkan informasi yang tersedia, serta menentukan langkah tindak lanjut yang sesuai.

## Contoh Situasi

Situasi berikut hanya menggambarkan jenis permasalahan yang dapat dihadapi pengguna. Contoh ini bukan batasan, dan peserta bebas mengangkat situasi lain yang relevan.

1. **Hadiah yang butuh biaya.** Seorang mahasiswa menerima pesan di Instagram dari akun yang mengaku sebagai penyelenggara beasiswa. Ia dinyatakan sebagai penerima, tetapi harus membayar biaya administrasi Rp50.000 dalam waktu satu jam agar hadiahnya tidak hangus. Ia belum pernah mendaftar beasiswa itu, tetapi takut kehilangan kesempatan.
2. **Ajakan dari grup.** Seorang siswa SMK ditambahkan ke grup chat yang ramai membicarakan investasi “cepat untung”. Anggota lain memamerkan bukti penarikan dana dan terus mendorongnya segera bergabung sebelum kuota ditutup. Ia penasaran, tetapi tidak yakin mana yang nyata.
3. **Tautan dari teman.** Seorang pelajar menerima pesan dari akun teman dekatnya berisi tautan dan tulisan “coba lihat ini, kamu ada di foto ini”. Tautannya terlihat sedikit janggal, dan gaya bahasanya tidak seperti biasanya. Ia ragu apakah akun temannya diretas atau ia hanya terlalu curiga.

## Ketentuan

Peserta bebas menentukan pendekatan solusi, target pengguna yang lebih spesifik, dan teknologi yang digunakan, selama solusi yang dikembangkan tetap relevan dengan permasalahan dalam studi kasus dan memenuhi ketentuan kompetisi.$md$,
  NULL
);


-- ============================================================================
-- 1.3 SUBMISSION RECEIPT & LINK CHECK COLUMNS
-- ============================================================================
ALTER TABLE public.submissions
  ADD COLUMN first_submitted_at TIMESTAMPTZ,
  ADD COLUMN link_check JSONB,
  ADD COLUMN link_checked_at TIMESTAMPTZ;

-- Backfill data uji yang sudah berstatus 'submitted'
UPDATE public.submissions
   SET first_submitted_at = submitted_at
 WHERE status = 'submitted';

CREATE OR REPLACE FUNCTION public.submissions_set_first_submitted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.first_submitted_at IS NOT NULL THEN
    NEW.first_submitted_at := OLD.first_submitted_at;      -- terkunci selamanya
  ELSIF NEW.status = 'submitted' THEN
    NEW.first_submitted_at := now();                       -- pertama kali tombol Kirim ditekan
  ELSE
    NEW.first_submitted_at := null;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER submissions_first_submitted_at
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.submissions_set_first_submitted_at();


-- ============================================================================
-- 1.4 FINALIST NOTICE
-- ============================================================================
CREATE TABLE public.finalist_notice (
  id                   BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  finalist_message     TEXT NOT NULL DEFAULT '',
  non_finalist_message TEXT NOT NULL DEFAULT '',
  is_published         BOOLEAN NOT NULL DEFAULT FALSE,
  published_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.finalist_notice ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_finalist_notice_touch
  BEFORE UPDATE ON public.finalist_notice
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Admin only. Tim TIDAK PERNAH membaca tabel ini secara langsung.
CREATE POLICY "Admin full access finalist_notice" ON public.finalist_notice
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

INSERT INTO public.finalist_notice (id) VALUES (TRUE);

-- RPC function untuk peserta membaca pengumuman miliknya secara aman
CREATE OR REPLACE FUNCTION public.get_my_finalist_notice()
RETURNS TABLE (is_finalist boolean, message text, published_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.is_finalist,
         CASE WHEN t.is_finalist THEN n.finalist_message
              ELSE n.non_finalist_message END,
         n.published_at
    FROM public.finalist_notice n
    JOIN public.teams t ON t.profile_id = (SELECT auth.uid())
   WHERE n.is_published
     AND NOT t.is_disqualified
     AND public.current_user_role() = 'team';
$$;

REVOKE ALL ON FUNCTION public.get_my_finalist_notice() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_finalist_notice() TO authenticated;
