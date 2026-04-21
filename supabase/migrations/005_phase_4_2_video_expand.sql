-- DayPic Phase 4.2 Video Portfolio Expand
-- 2026-04-21
--
-- 목표: video_link_1..4 / video_thumb_1..4 반복 컬럼을 관계 테이블로 준비.
-- 이 마이그레이션은 **Expand 단계만** — 신규 테이블 생성 + 기존 데이터 1회 이관 + 동기화 트리거.
-- 앱 코드는 계속 artists의 video_link_N 컬럼을 읽고 씁니다. 트리거가 자동으로
-- video_portfolio_items에 반영해주므로 회귀 위험 없음.
--
-- Contract 단계(구 컬럼 DROP)는 클라이언트까지 관계 테이블로 전환한 뒤 별도 마이그레이션.

-- ============================================================
-- 0. set_updated_at() 함수 보장 (001이 누락됐을 경우 대비, 멱등)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- artists / users 트리거도 혹시 누락되었으면 함께 복구
DROP TRIGGER IF EXISTS trg_artists_set_updated_at ON artists;
CREATE TRIGGER trg_artists_set_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 1. 관계 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS video_portfolio_items (
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 10),
  link TEXT NOT NULL,
  thumb TEXT,
  style_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (artist_id, position)
);

CREATE INDEX IF NOT EXISTS idx_video_portfolio_artist
  ON video_portfolio_items (artist_id);

DROP TRIGGER IF EXISTS trg_video_portfolio_set_updated_at ON video_portfolio_items;
CREATE TRIGGER trg_video_portfolio_set_updated_at
  BEFORE UPDATE ON video_portfolio_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE video_portfolio_items ENABLE ROW LEVEL SECURITY;
-- artists_public처럼 공개용 뷰 필요시 Phase 5에서 추가. 지금은 service_role 전용.
DROP POLICY IF EXISTS "video_portfolio_items_select_public" ON video_portfolio_items;
REVOKE SELECT ON video_portfolio_items FROM anon;

-- ============================================================
-- 2. 기존 데이터 1회 이관 (artists.video_link_N → video_portfolio_items)
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
-- 3. 동기화 트리거 — artists.video_link_N 변경 시 관계 테이블 반영
--    앱 코드 변경 없이 신규 테이블이 항상 최신 상태를 유지하게 함.
-- ============================================================
CREATE OR REPLACE FUNCTION sync_video_portfolio_items()
RETURNS TRIGGER AS $$
DECLARE
  pos SMALLINT;
  link TEXT;
  thumb TEXT;
BEGIN
  FOR pos IN 1..4 LOOP
    CASE pos
      WHEN 1 THEN link := NEW.video_link_1; thumb := NEW.video_thumb_1;
      WHEN 2 THEN link := NEW.video_link_2; thumb := NEW.video_thumb_2;
      WHEN 3 THEN link := NEW.video_link_3; thumb := NEW.video_thumb_3;
      WHEN 4 THEN link := NEW.video_link_4; thumb := NEW.video_thumb_4;
    END CASE;

    IF link IS NULL OR link = '' THEN
      DELETE FROM video_portfolio_items
       WHERE artist_id = NEW.id AND position = pos;
    ELSE
      INSERT INTO video_portfolio_items (artist_id, position, link, thumb, style_tags)
      VALUES (NEW.id, pos, link, NULLIF(thumb, ''), COALESCE(NEW.video_style_tags, '{}'))
      ON CONFLICT (artist_id, position)
      DO UPDATE SET
        link = EXCLUDED.link,
        thumb = EXCLUDED.thumb,
        style_tags = EXCLUDED.style_tags,
        updated_at = NOW();
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_artists_sync_video_portfolio ON artists;
CREATE TRIGGER trg_artists_sync_video_portfolio
  AFTER INSERT OR UPDATE OF
    video_link_1, video_link_2, video_link_3, video_link_4,
    video_thumb_1, video_thumb_2, video_thumb_3, video_thumb_4,
    video_style_tags
  ON artists
  FOR EACH ROW EXECUTE FUNCTION sync_video_portfolio_items();

-- ============================================================
-- 4. 검증
-- ============================================================
SELECT 'video_portfolio_items count' AS check, COUNT(*) AS n
FROM video_portfolio_items;

SELECT 'sample row' AS check, artist_id, position, link, thumb
FROM video_portfolio_items
ORDER BY artist_id, position
LIMIT 5;

SELECT 'trigger installed' AS check, tgname
FROM pg_trigger
WHERE tgrelid = 'artists'::regclass
  AND tgname = 'trg_artists_sync_video_portfolio';

-- ============================================================
-- 롤백
-- ============================================================
-- DROP TRIGGER IF EXISTS trg_artists_sync_video_portfolio ON artists;
-- DROP FUNCTION IF EXISTS sync_video_portfolio_items();
-- DROP TABLE IF EXISTS video_portfolio_items;
