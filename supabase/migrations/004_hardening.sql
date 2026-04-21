-- DayPic Hardening — 외부 리뷰어 지적사항 반영
-- 2026-04-21
--
-- 목표:
--   [#6] anon SELECT로 PII(phone/email/kakao_id/user_id) 노출 차단 → artists_public view 분리
--   [#8] closed_dates(artist_id, closed_date) UNIQUE가 운영 DB에 실제로 있는지 확인 후 보강
--   [#19] artists 실수 삭제 방지 (soft-delete 권고는 문서 차원, 여기선 FK는 CASCADE 유지)
--
-- 멱등. 재실행 안전.

-- ============================================================
-- 1. closed_dates UNIQUE 확인 및 보강
-- ============================================================
SELECT 'closed_dates unique constraint exists?' AS check,
       EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conrelid = 'closed_dates'::regclass
           AND contype = 'u'
           AND conkey @> ARRAY[
             (SELECT attnum FROM pg_attribute WHERE attrelid='closed_dates'::regclass AND attname='artist_id'),
             (SELECT attnum FROM pg_attribute WHERE attrelid='closed_dates'::regclass AND attname='closed_date')
           ]
       ) AS exists_flag;

-- 없으면 추가 (이미 있으면 no-op)
CREATE UNIQUE INDEX IF NOT EXISTS closed_dates_artist_date_uniq
  ON closed_dates (artist_id, closed_date);

-- ============================================================
-- 2. artists PII 보호 — artists_public view 분리
-- ============================================================
-- 기존 anon SELECT 정책 제거 (원본 테이블 노출 차단)
DROP POLICY IF EXISTS "artists_select_public" ON artists;

-- 민감 컬럼(phone/email/kakao_id/user_id)은 제외한 공개 뷰
CREATE OR REPLACE VIEW artists_public AS
  SELECT
    id,
    artist_id,
    name,
    service,
    region,
    price,
    artist_type,
    portfolio,
    image,
    portfolio_images,
    rating,
    style_keywords,
    open_chat_url,
    video_link_1, video_link_2, video_link_3, video_link_4,
    video_thumbnail,
    video_thumb_1, video_thumb_2, video_thumb_3, video_thumb_4,
    video_style_tags,
    created_at,
    updated_at
  FROM artists;

-- anon이 view를 SELECT 할 수 있도록 grant
GRANT SELECT ON artists_public TO anon;
GRANT SELECT ON artists_public TO authenticated;

-- 원본 artists는 service_role만 접근 가능 (anon 차단)
REVOKE SELECT ON artists FROM anon;

-- 주의: 앱은 getSupabaseAdmin()(service_role)으로 접근하므로 영향 없음.
-- 만약 클라이언트에서 직접 anon으로 artists를 읽던 부분이 있었다면 artists_public로 교체 필요.

-- ============================================================
-- 3. closed_dates도 anon 공개 완화 여지 검토
-- ============================================================
-- 앱은 service_role로만 closed_dates에 접근하므로 public SELECT 제거해도 무해.
DROP POLICY IF EXISTS "closed_dates_select_public" ON closed_dates;
REVOKE SELECT ON closed_dates FROM anon;

-- ============================================================
-- 4. 검증
-- ============================================================
SELECT 'closed_dates indexes' AS check, indexname
FROM pg_indexes
WHERE tablename = 'closed_dates'
ORDER BY indexname;

SELECT 'artists policies' AS check, polname
FROM pg_policy
WHERE polrelid = 'artists'::regclass;

SELECT 'artists_public grants' AS check, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'artists_public';

-- ============================================================
-- 롤백
-- ============================================================
-- GRANT SELECT ON artists TO anon;
-- CREATE POLICY "artists_select_public" ON artists FOR SELECT USING (true);
-- DROP VIEW IF EXISTS artists_public;
-- DROP INDEX IF EXISTS closed_dates_artist_date_uniq;
-- GRANT SELECT ON closed_dates TO anon;
-- CREATE POLICY "closed_dates_select_public" ON closed_dates FOR SELECT USING (true);
