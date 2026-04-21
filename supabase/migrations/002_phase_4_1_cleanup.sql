-- DayPic Phase 4.1 Cleanup
-- 2026-04-21
--
-- 선행 조건:
--   (1) 001_hotfix_phase_3_5.sql 실행 완료 (closed_dates.artist_id 재맵핑 완료)
--   (2) Hotfix 포함된 앱 배포 완료 (artists.keywords / closed_dates.{artist_email, owner_user_id, date_key} 쓰기 중단됨)
--
-- 목표:
--   H2. artists.keywords 컬럼 제거 (style_keywords로 통일)
--   H3. closed_dates 죽은 컬럼 제거 + FK + CASCADE
--
-- 앱이 아직 구 컬럼을 쓰는 상태면 이 마이그레이션은 실행하지 말 것.

-- ============================================================
-- 1. closed_dates 고아 레코드 확인 (쓰기 없음)
-- ============================================================
SELECT 'closed_dates orphan check' AS check, COUNT(*) AS n
FROM closed_dates cd
LEFT JOIN artists a ON a.id = cd.artist_id
WHERE a.id IS NULL;

-- 고아가 있으면 아래를 실행 (주석 해제)
-- DELETE FROM closed_dates cd
-- WHERE NOT EXISTS (SELECT 1 FROM artists a WHERE a.id = cd.artist_id);

-- ============================================================
-- 2. closed_dates FK + ON DELETE CASCADE
-- ============================================================
ALTER TABLE closed_dates
  DROP CONSTRAINT IF EXISTS closed_dates_artist_fk;

ALTER TABLE closed_dates
  ADD CONSTRAINT closed_dates_artist_fk
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
  NOT VALID;

ALTER TABLE closed_dates VALIDATE CONSTRAINT closed_dates_artist_fk;

-- ============================================================
-- 3. closed_dates 죽은 컬럼 DROP
-- ============================================================
DROP INDEX IF EXISTS idx_closed_dates_email;

ALTER TABLE closed_dates DROP COLUMN IF EXISTS artist_email;
ALTER TABLE closed_dates DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE closed_dates DROP COLUMN IF EXISTS date_key;

-- ============================================================
-- 4. artists.keywords DROP (style_keywords로 통일)
--    ※ Hotfix 포함 앱이 keywords 컬럼에 쓰지 않아야 함.
-- ============================================================
ALTER TABLE artists DROP COLUMN IF EXISTS keywords;

-- ============================================================
-- 5. 검증
-- ============================================================
SELECT 'closed_dates columns' AS check, column_name
FROM information_schema.columns
WHERE table_name = 'closed_dates'
ORDER BY ordinal_position;

SELECT 'artists keywords dropped' AS check,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artists' AND column_name = 'keywords'
  ) AS still_exists;

SELECT 'closed_dates FK' AS check, conname, confrelid::regclass AS refs
FROM pg_constraint
WHERE conname = 'closed_dates_artist_fk';

-- ============================================================
-- 롤백
-- ============================================================
-- ALTER TABLE artists ADD COLUMN IF NOT EXISTS keywords TEXT[];
-- UPDATE artists SET keywords = style_keywords WHERE keywords IS NULL;
--
-- ALTER TABLE closed_dates
--   ADD COLUMN IF NOT EXISTS artist_email TEXT,
--   ADD COLUMN IF NOT EXISTS owner_user_id TEXT,
--   ADD COLUMN IF NOT EXISTS date_key TEXT;
-- CREATE INDEX IF NOT EXISTS idx_closed_dates_email ON closed_dates (artist_email);
--
-- ALTER TABLE closed_dates DROP CONSTRAINT IF EXISTS closed_dates_artist_fk;
