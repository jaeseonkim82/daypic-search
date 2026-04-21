-- DayPic Supabase 스키마 (Hotfix Phase 3.5 + Phase 4.1 반영)
-- Supabase Dashboard → SQL Editor에서 실행
-- 재실행 안전 (IF NOT EXISTS, DROP POLICY/TRIGGER IF EXISTS, ON CONFLICT)
--
-- 순차 마이그레이션이 필요한 기존 환경은 migrations/001, 002 파일 사용.
-- 이 파일은 신규 환경 bootstrap용 최신 상태 스냅샷.

-- ============================================================
-- updated_at 자동 갱신 함수
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- users 테이블 (NextAuth 세션 연동용)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- "user_{kakao_id}" 또는 기존 user_id 유지
  kakao_id TEXT UNIQUE,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON users (kakao_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- 민감 데이터(email) 보호: anon SELECT 정책 없음 (service_role만 접근)
DROP POLICY IF EXISTS "users_select_public" ON users;


-- ============================================================
-- artists 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  artist_id TEXT,
  user_id TEXT,
  kakao_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  service TEXT[],
  region TEXT[],
  price TEXT,
  artist_type TEXT,
  portfolio TEXT,
  image TEXT,
  portfolio_images TEXT[],
  rating NUMERIC DEFAULT 4.8,
  style_keywords TEXT[],
  open_chat_url TEXT,
  video_link_1 TEXT,
  video_link_2 TEXT,
  video_link_3 TEXT,
  video_link_4 TEXT,
  video_thumbnail TEXT,
  video_thumb_1 TEXT,
  video_thumb_2 TEXT,
  video_thumb_3 TEXT,
  video_thumb_4 TEXT,
  video_style_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artists_region ON artists USING GIN (region);
CREATE INDEX IF NOT EXISTS idx_artists_service ON artists USING GIN (service);
CREATE INDEX IF NOT EXISTS idx_artists_email ON artists (email);
CREATE INDEX IF NOT EXISTS idx_artists_kakao_lookup ON artists (kakao_id);

-- 보조 식별자 UNIQUE (NULL 허용)
CREATE UNIQUE INDEX IF NOT EXISTS artists_artist_id_uniq
  ON artists (artist_id) WHERE artist_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS artists_kakao_id_uniq
  ON artists (kakao_id) WHERE kakao_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS artists_email_lower_uniq
  ON artists (lower(email)) WHERE email IS NOT NULL;

DROP TRIGGER IF EXISTS trg_artists_set_updated_at ON artists;
CREATE TRIGGER trg_artists_set_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "artists_select_public" ON artists;
-- 원본 artists는 service_role만 접근. 민감 컬럼 제외된 artists_public 뷰로 공개.
REVOKE SELECT ON artists FROM anon;

-- PII(phone/email/kakao_id/user_id) 제외한 공개 뷰
CREATE OR REPLACE VIEW artists_public AS
  SELECT
    id, artist_id, name, service, region, price, artist_type,
    portfolio, image, portfolio_images, rating,
    style_keywords, open_chat_url,
    video_link_1, video_link_2, video_link_3, video_link_4,
    video_thumbnail,
    video_thumb_1, video_thumb_2, video_thumb_3, video_thumb_4,
    video_style_tags,
    created_at, updated_at
  FROM artists;

GRANT SELECT ON artists_public TO anon;
GRANT SELECT ON artists_public TO authenticated;


-- ============================================================
-- closed_dates 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS closed_dates (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  closed_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (artist_id, closed_date)
);

CREATE INDEX IF NOT EXISTS idx_closed_dates_artist_id ON closed_dates (artist_id);
CREATE INDEX IF NOT EXISTS idx_closed_dates_date ON closed_dates (closed_date);

ALTER TABLE closed_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "closed_dates_select_public" ON closed_dates;
-- closed_dates는 service_role만 접근 (작가 스케줄은 내부 API로만 공개)
REVOKE SELECT ON closed_dates FROM anon;
