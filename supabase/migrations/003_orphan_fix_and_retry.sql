-- DayPic Phase 4.1 Orphan Fix & FK Retry
-- 2026-04-21
--
-- 상황:
--   002_phase_4_1_cleanup.sql의 FK 추가 단계에서 아래 에러 발생
--     ERROR: insert or update on table "closed_dates" violates foreign key
--     DETAIL: Key (artist_id)=(artist_reckiOB6ud4WTTlno) is not present in table "artists".
--
-- 원인:
--   1) 'artist_rec...' 혼종 포맷(artist_ 접두사 + Airtable recordId)이 남아있음
--      → 001의 재맵핑 쿼리는 cd.artist_id = a.artist_id 매칭인데,
--        artists 테이블에 'artist_rec...' 값이 없으므로 매칭 실패하여 미변환됨.
--   2) 혹은 진짜 고아(삭제된 작가 참조) 레코드.
--
-- 이 파일은 멱등하며, 001/002의 누락분 보강 + 재시도.

-- ============================================================
-- 0. 현재 상태 확인
-- ============================================================
SELECT 'closed_dates artist_id formats (before)' AS check, format, COUNT(*) AS n
FROM (
  SELECT
    CASE
      WHEN artist_id LIKE 'artist_rec%' THEN 'artist_+recordId(hybrid)'
      WHEN artist_id LIKE 'rec%' THEN 'recordId'
      WHEN artist_id LIKE 'artist_%' THEN 'artistCode'
      ELSE 'other'
    END AS format
  FROM closed_dates
) sub
GROUP BY format;

-- ============================================================
-- 1. 혼종 포맷(artist_rec...) → rec... 로 벗기고 artists.id에 존재하는지 확인
-- ============================================================
UPDATE closed_dates cd
SET artist_id = SUBSTRING(cd.artist_id FROM 8)   -- 'artist_' 제거
WHERE cd.artist_id LIKE 'artist_rec%'
  AND EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = SUBSTRING(cd.artist_id FROM 8)
  );

-- ============================================================
-- 2. 순수 artist_code(artist_xxx) 재맵핑 (001 재실행 효과)
-- ============================================================
UPDATE closed_dates cd
SET artist_id = a.id
FROM artists a
WHERE cd.artist_id = a.artist_id
  AND cd.artist_id LIKE 'artist_%'
  AND a.id LIKE 'rec%';

-- ============================================================
-- 3. 고아 레코드 확인 — 아직 남아있으면 주로 삭제된 작가 참조
-- ============================================================
SELECT 'orphan closed_dates' AS check,
       cd.id AS closed_id,
       cd.artist_id,
       cd.closed_date
FROM closed_dates cd
LEFT JOIN artists a ON a.id = cd.artist_id
WHERE a.id IS NULL
ORDER BY cd.closed_date;

-- ============================================================
-- 4. 고아 삭제 (사전 확인 후 실행)
--    ※ 위 쿼리 결과가 예상 범위면 그대로 실행.
--    ※ 손대고 싶지 않은 레코드가 있으면 이 DELETE 대신 수동 처리.
-- ============================================================
DELETE FROM closed_dates cd
WHERE NOT EXISTS (
  SELECT 1 FROM artists a WHERE a.id = cd.artist_id
);

-- ============================================================
-- 5. FK 추가 재시도
-- ============================================================
ALTER TABLE closed_dates
  DROP CONSTRAINT IF EXISTS closed_dates_artist_fk;

ALTER TABLE closed_dates
  ADD CONSTRAINT closed_dates_artist_fk
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
  NOT VALID;

ALTER TABLE closed_dates VALIDATE CONSTRAINT closed_dates_artist_fk;

-- ============================================================
-- 6. 죽은 컬럼 DROP (002에서 이미 제거됐다면 no-op)
-- ============================================================
DROP INDEX IF EXISTS idx_closed_dates_email;
ALTER TABLE closed_dates DROP COLUMN IF EXISTS artist_email;
ALTER TABLE closed_dates DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE closed_dates DROP COLUMN IF EXISTS date_key;

-- ============================================================
-- 7. artists.keywords DROP (002에서 이미 제거됐다면 no-op)
-- ============================================================
ALTER TABLE artists DROP COLUMN IF EXISTS keywords;

-- ============================================================
-- 8. 최종 검증
-- ============================================================
SELECT 'closed_dates artist_id formats (after)' AS check, format, COUNT(*) AS n
FROM (
  SELECT
    CASE
      WHEN artist_id LIKE 'rec%' THEN 'recordId'
      WHEN artist_id LIKE 'artist_%' THEN 'artistCode(leftover)'
      ELSE 'other'
    END AS format
  FROM closed_dates
) sub
GROUP BY format;

SELECT 'closed_dates FK' AS check, conname
FROM pg_constraint
WHERE conname = 'closed_dates_artist_fk';

SELECT 'closed_dates columns' AS check, column_name
FROM information_schema.columns
WHERE table_name = 'closed_dates'
ORDER BY ordinal_position;

SELECT 'artists keywords remaining?' AS check,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artists' AND column_name = 'keywords'
  ) AS exists_flag;
