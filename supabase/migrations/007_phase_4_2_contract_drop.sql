-- DayPic Phase 4.2 Contract — 구 video 컬럼 DROP
-- 2026-04-23
--
-- 선행 조건 (반드시 배포 완료 후 실행):
--   (1) 005_phase_4_2_video_expand.sql 실행되어 video_portfolio_items 테이블과
--       데이터가 최신 상태 (005 트리거가 그간 자동 동기화).
--   (2) video-portfolio PATCH가 artists.video_* 컬럼을 더 이상 쓰지 않는 앱
--       배포 완료 (feat phase-4.2 contract 최종 커밋).
--   (3) 응답 normalizeArtist / artistRowToResponse 가 items 기반으로 파생 중.
--
-- 이 마이그레이션이 하는 일:
--   A. 동기화 트리거 + 함수 제거 (더 이상 artists → items 동기화 필요 없음)
--   B. artists.video_link_1..4, video_thumb_1..4, video_thumbnail,
--      video_style_tags 컬럼 DROP
--
-- 롤백은 하단 주석 참조. 단 컬럼 DROP 후 데이터 복구는 video_portfolio_items에서
-- 역으로 재구성해야 함 (빠진 데이터는 복원 불가 케이스 존재).

-- ============================================================
-- 1. 사전 점검 (쓰기 없음)
-- ============================================================
-- items와 artists의 video_link_1 불일치 건수
SELECT 'drift check' AS check, COUNT(*) AS drift_count
FROM artists a
LEFT JOIN video_portfolio_items v
  ON v.artist_id = a.id AND v.position = 1
WHERE COALESCE(NULLIF(a.video_link_1, ''), '') <> COALESCE(v.link, '');

-- artists 전체 중 video_link_1 가진 행
SELECT 'artists with video_link_1' AS check, COUNT(*) AS n
FROM artists WHERE video_link_1 IS NOT NULL AND video_link_1 <> '';

-- items 총 개수
SELECT 'items total' AS check, COUNT(*) AS n FROM video_portfolio_items;

-- ============================================================
-- 2. 최종 드리프트 교정 — items에 없는 artists.video_link_N 이 있으면
--    items로 한 번 더 이관 (멱등)
-- ============================================================
INSERT INTO video_portfolio_items (artist_id, position, link, thumb, style_tags)
SELECT id, 1, video_link_1, NULLIF(video_thumb_1, ''), COALESCE(video_style_tags, '{}')
FROM artists
WHERE video_link_1 IS NOT NULL AND video_link_1 <> ''
ON CONFLICT (artist_id, position) DO NOTHING;

INSERT INTO video_portfolio_items (artist_id, position, link, thumb, style_tags)
SELECT id, 2, video_link_2, NULLIF(video_thumb_2, ''), COALESCE(video_style_tags, '{}')
FROM artists
WHERE video_link_2 IS NOT NULL AND video_link_2 <> ''
ON CONFLICT (artist_id, position) DO NOTHING;

INSERT INTO video_portfolio_items (artist_id, position, link, thumb, style_tags)
SELECT id, 3, video_link_3, NULLIF(video_thumb_3, ''), COALESCE(video_style_tags, '{}')
FROM artists
WHERE video_link_3 IS NOT NULL AND video_link_3 <> ''
ON CONFLICT (artist_id, position) DO NOTHING;

INSERT INTO video_portfolio_items (artist_id, position, link, thumb, style_tags)
SELECT id, 4, video_link_4, NULLIF(video_thumb_4, ''), COALESCE(video_style_tags, '{}')
FROM artists
WHERE video_link_4 IS NOT NULL AND video_link_4 <> ''
ON CONFLICT (artist_id, position) DO NOTHING;

-- ============================================================
-- 3. 동기화 트리거 + 함수 제거
-- ============================================================
DROP TRIGGER IF EXISTS trg_artists_sync_video_portfolio ON artists;
DROP FUNCTION IF EXISTS sync_video_portfolio_items();

-- ============================================================
-- 4. artists_public 뷰 선제 DROP (컬럼 의존성 제거)
--    — 004/006 에서 생성된 뷰가 video_* 컬럼을 참조하고 있으면
--      이후 ALTER TABLE DROP COLUMN 이 막히므로 먼저 제거.
-- ============================================================
DROP VIEW IF EXISTS artists_public;

-- ============================================================
-- 5. artists 구 video 컬럼 DROP
-- ============================================================
ALTER TABLE artists
  DROP COLUMN IF EXISTS video_link_1,
  DROP COLUMN IF EXISTS video_link_2,
  DROP COLUMN IF EXISTS video_link_3,
  DROP COLUMN IF EXISTS video_link_4,
  DROP COLUMN IF EXISTS video_thumb_1,
  DROP COLUMN IF EXISTS video_thumb_2,
  DROP COLUMN IF EXISTS video_thumb_3,
  DROP COLUMN IF EXISTS video_thumb_4,
  DROP COLUMN IF EXISTS video_thumbnail,
  DROP COLUMN IF EXISTS video_style_tags;

-- ============================================================
-- 6. artists_public 뷰 재생성 (DROP 된 컬럼 제외)
-- ============================================================
CREATE VIEW artists_public
  WITH (security_invoker = on) AS
  SELECT
    id, artist_id, name, service, region, price, artist_type,
    portfolio, image, portfolio_images, rating,
    style_keywords, open_chat_url,
    created_at, updated_at
  FROM artists;

GRANT SELECT ON artists_public TO anon;
GRANT SELECT ON artists_public TO authenticated;

-- ============================================================
-- 7. 검증
-- ============================================================
SELECT 'artists columns after DROP' AS check, column_name
FROM information_schema.columns
WHERE table_name = 'artists' AND column_name LIKE 'video_%'
ORDER BY column_name;
-- ↑ 결과 0건이어야 성공

SELECT 'sync trigger removed' AS check,
  NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_artists_sync_video_portfolio'
  ) AS removed;

SELECT 'sync function removed' AS check,
  NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'sync_video_portfolio_items'
  ) AS removed;

-- ============================================================
-- 롤백 (간략) — 데이터 소실 위험 있음. 실행 전 pg_dump 권장.
-- ============================================================
-- ALTER TABLE artists
--   ADD COLUMN video_link_1 TEXT,
--   ADD COLUMN video_link_2 TEXT,
--   ADD COLUMN video_link_3 TEXT,
--   ADD COLUMN video_link_4 TEXT,
--   ADD COLUMN video_thumb_1 TEXT,
--   ADD COLUMN video_thumb_2 TEXT,
--   ADD COLUMN video_thumb_3 TEXT,
--   ADD COLUMN video_thumb_4 TEXT,
--   ADD COLUMN video_thumbnail TEXT,
--   ADD COLUMN video_style_tags TEXT[];
--
-- -- items → artists 역이관
-- UPDATE artists a SET
--   video_link_1 = v1.link, video_thumb_1 = v1.thumb,
--   video_style_tags = COALESCE(v1.style_tags, '{}')
-- FROM video_portfolio_items v1
-- WHERE v1.artist_id = a.id AND v1.position = 1;
-- -- position 2, 3, 4도 유사
--
-- -- 005의 트리거/함수 복구는 005 파일 재실행.
