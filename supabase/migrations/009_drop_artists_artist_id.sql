-- DayPic Phase C — artists.artist_id 컬럼 DROP
-- 2026-04-26
--
-- 선행 조건 (반드시 배포 완료 후 실행):
--   (1) Phase A (커밋 71446a4): API 응답에서 artist_id 필드 제거
--   (2) Phase B (커밋 06135d6): findArtistRow lookup 분기 제거 + register 에서 NULL insert
--   (3) 위 변경이 프로덕션 배포 완료 — 더 이상 코드가 artist_id 컬럼 읽거나 쓰지 않음
--
-- 이 마이그레이션이 하는 일:
--   A. artists_public 뷰가 artist_id 참조하면 선제 DROP 후 재생성
--   B. artists_artist_id_uniq 부분 인덱스 DROP
--   C. register_artist RPC 함수 시그니처에서 p_artist_id 제거 (재생성)
--   D. artists.artist_id 컬럼 DROP
--
-- 멱등 (IF EXISTS).

-- ============================================================
-- 0. 사전 점검 (쓰기 없음)
-- ============================================================
SELECT 'artists_with_artist_id' AS check, COUNT(*) AS n
FROM artists
WHERE artist_id IS NOT NULL;

SELECT 'artists_public depends on artist_id?' AS check,
  EXISTS (
    SELECT 1
    FROM information_schema.view_column_usage
    WHERE view_name = 'artists_public'
      AND column_name = 'artist_id'
  ) AS depends;

-- ============================================================
-- 1. artists_public 뷰 선제 DROP (의존성 제거)
-- ============================================================
DROP VIEW IF EXISTS artists_public;

-- ============================================================
-- 2. UNIQUE 인덱스 DROP
-- ============================================================
DROP INDEX IF EXISTS artists_artist_id_uniq;

-- ============================================================
-- 3. register_artist RPC 재정의 — p_artist_id 인자 제거
-- ============================================================
-- 기존(13 args) drop 후 신규(12 args) create. 호출 측은 06135d6 이후
-- p_artist_id 를 보내지 않으므로 신규 시그니처와 호환됨.
DROP FUNCTION IF EXISTS register_artist(
  text, text, text, text, text, text, text,
  text[], text[], text, text[], text, text
);

CREATE OR REPLACE FUNCTION register_artist(
  p_id          text,
  p_user_id     text,
  p_kakao_id    text,
  p_email       text,
  p_name        text,
  p_phone       text,
  p_service     text[],
  p_region      text[],
  p_price       text,
  p_style_keywords text[],
  p_portfolio   text,
  p_open_chat_url text
) RETURNS artists
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artist artists;
BEGIN
  INSERT INTO users (id, kakao_id, email, name, updated_at)
  VALUES (p_user_id, p_kakao_id, p_email, p_name, now())
  ON CONFLICT (id) DO UPDATE SET
    kakao_id   = EXCLUDED.kakao_id,
    email      = EXCLUDED.email,
    name       = EXCLUDED.name,
    updated_at = now();

  INSERT INTO artists (
    id, user_id, kakao_id, name, email, phone,
    service, region, price, style_keywords,
    portfolio, open_chat_url, rating
  ) VALUES (
    p_id, p_user_id, p_kakao_id, p_name, p_email, p_phone,
    p_service, p_region, p_price, p_style_keywords,
    p_portfolio, p_open_chat_url, 4.8
  )
  RETURNING * INTO v_artist;

  RETURN v_artist;
END;
$$;

REVOKE ALL ON FUNCTION register_artist(
  text, text, text, text, text, text,
  text[], text[], text, text[], text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_artist(
  text, text, text, text, text, text,
  text[], text[], text, text[], text, text
) TO service_role;

-- ============================================================
-- 4. artists.artist_id 컬럼 DROP
-- ============================================================
ALTER TABLE artists DROP COLUMN IF EXISTS artist_id;

-- ============================================================
-- 5. artists_public 뷰 재생성 (artist_id 제외)
-- ============================================================
CREATE VIEW artists_public
  WITH (security_invoker = on) AS
  SELECT
    id, name, service, region, price, artist_type,
    portfolio, image, portfolio_images, rating,
    style_keywords, open_chat_url,
    created_at, updated_at
  FROM artists;

GRANT SELECT ON artists_public TO anon;
GRANT SELECT ON artists_public TO authenticated;

-- ============================================================
-- 6. 검증
-- ============================================================
SELECT 'artists has artist_id?' AS check,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artists' AND column_name = 'artist_id'
  ) AS still_exists;
-- ↑ false 여야 성공

SELECT 'register_artist signature' AS check, pg_get_function_arguments(p.oid)
FROM pg_proc p
WHERE p.proname = 'register_artist';
-- ↑ p_artist_id 없어야 성공

-- ============================================================
-- 롤백 (간략) — 데이터 소실 위험. pg_dump 권장.
-- ============================================================
-- ALTER TABLE artists ADD COLUMN artist_id TEXT;
-- CREATE UNIQUE INDEX artists_artist_id_uniq
--   ON artists (artist_id) WHERE artist_id IS NOT NULL;
-- 그리고 008_register_artist_rpc.sql 재실행으로 RPC 13 args 복구.
-- artists_public 뷰는 007 의 정의로 복구.
