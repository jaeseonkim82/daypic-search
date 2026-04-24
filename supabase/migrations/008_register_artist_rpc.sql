-- DayPic Phase 4.x 운영 하드닝 — register 트랜잭션
-- 2026-04-24
--
-- 문제: /api/artists/register 는 users upsert → artists insert 2단계.
--   artists insert 가 23505 등으로 실패하면 users 만 남아서 half-registered 상태.
--   현재는 재시도 시 users upsert 가 멱등이라 자가 치유되지만, 원자성은 없다.
--
-- 해결: register_artist PL/pgSQL 함수로 감싸 단일 트랜잭션에서 두 INSERT 수행.
-- 함수 내부의 어떤 exception 도 전체 rollback 보장 (PL/pgSQL 기본).
--
-- 멱등. 재실행 안전.

CREATE OR REPLACE FUNCTION register_artist(
  p_id          text,
  p_artist_id   text,
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
  -- 1) users upsert (세션 식별자 기준)
  INSERT INTO users (id, kakao_id, email, name, updated_at)
  VALUES (p_user_id, p_kakao_id, p_email, p_name, now())
  ON CONFLICT (id) DO UPDATE SET
    kakao_id   = EXCLUDED.kakao_id,
    email      = EXCLUDED.email,
    name       = EXCLUDED.name,
    updated_at = now();

  -- 2) artists insert (UNIQUE 위반 등은 여기서 예외 → 전체 rollback)
  INSERT INTO artists (
    id, artist_id, user_id, kakao_id, name, email, phone,
    service, region, price, style_keywords,
    portfolio, open_chat_url, rating
  ) VALUES (
    p_id, p_artist_id, p_user_id, p_kakao_id, p_name, p_email, p_phone,
    p_service, p_region, p_price, p_style_keywords,
    p_portfolio, p_open_chat_url, 4.8
  )
  RETURNING * INTO v_artist;

  RETURN v_artist;
END;
$$;

-- service_role 에서만 호출 (앱 라우트)
REVOKE ALL ON FUNCTION register_artist(
  text, text, text, text, text, text, text,
  text[], text[], text, text[], text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_artist(
  text, text, text, text, text, text, text,
  text[], text[], text, text[], text, text
) TO service_role;

-- 검증
SELECT 'register_artist fn' AS check, proname, prosecdef
FROM pg_proc WHERE proname = 'register_artist';

-- 롤백
-- DROP FUNCTION IF EXISTS register_artist(
--   text, text, text, text, text, text, text,
--   text[], text[], text, text[], text, text
-- );
