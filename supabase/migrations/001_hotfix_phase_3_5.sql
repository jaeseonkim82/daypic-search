-- DayPic Hotfix Phase 3.5
-- 2026-04-21
--
-- 적용 방법:
--   1) Supabase Dashboard → SQL Editor에 통째로 붙여넣고 Run.
--   2) 모든 블록은 멱등(IF NOT EXISTS / ON CONFLICT / WHERE NOT EXISTS)이라 재실행 안전.
--   3) 각 블록은 주석으로 단계 구분. 중간에 멈춰도 다시 실행 가능.
--
-- 목표:
--   C1. closed_dates.artist_id를 artists.id(rec...) 포맷으로 통일 (휴무일 필터 버그 근본 해결)
--   C4. users 테이블 anon SELECT 정책 제거 (PII 보호)
--   C5. artists 보조 식별자 UNIQUE 제약 추가 (중복 등록 방어)
--   +  updated_at 자동 갱신 트리거 (운영 편의)
--
-- 롤백은 이 파일 하단 주석 참조.

-- ============================================================
-- 0. 사전 점검 (쓰기 없음, 결과만 확인)
-- ============================================================
-- 중복 artist_id 존재 여부
SELECT 'artist_id dup check' AS check, artist_id, COUNT(*) AS n
FROM artists
WHERE artist_id IS NOT NULL
GROUP BY artist_id
HAVING COUNT(*) > 1;

-- 중복 kakao_id
SELECT 'kakao_id dup check' AS check, kakao_id, COUNT(*) AS n
FROM artists
WHERE kakao_id IS NOT NULL
GROUP BY kakao_id
HAVING COUNT(*) > 1;

-- 중복 email (소문자 기준)
SELECT 'email dup check' AS check, lower(email) AS email, COUNT(*) AS n
FROM artists
WHERE email IS NOT NULL
GROUP BY lower(email)
HAVING COUNT(*) > 1;

-- closed_dates의 artist_id 포맷 분포 (rec... vs artist_... vs 기타)
SELECT
  CASE
    WHEN artist_id LIKE 'rec%' THEN 'recordId'
    WHEN artist_id LIKE 'artist_%' THEN 'artistCode'
    ELSE 'other'
  END AS format,
  COUNT(*) AS n
FROM closed_dates
GROUP BY 1;

-- ============================================================
-- 1. closed_dates.artist_id 재맵핑 (artist_code → artists.id)
--    ※ 사전 점검에서 'artistCode'가 0이면 이 UPDATE는 0건.
-- ============================================================
UPDATE closed_dates cd
SET artist_id = a.id
FROM artists a
WHERE cd.artist_id = a.artist_id
  AND cd.artist_id LIKE 'artist_%'
  AND a.id LIKE 'rec%';

-- 2. 고아 closed_dates(참조하는 artists가 없는 행) 식별 (삭제는 선택)
SELECT 'orphan closed_dates' AS note, cd.id, cd.artist_id, cd.closed_date
FROM closed_dates cd
LEFT JOIN artists a ON a.id = cd.artist_id
WHERE a.id IS NULL;

-- 필요 시 수동 삭제:
-- DELETE FROM closed_dates cd
-- WHERE NOT EXISTS (SELECT 1 FROM artists a WHERE a.id = cd.artist_id);

-- ============================================================
-- 3. artists 보조 식별자 UNIQUE 제약 (부분 인덱스로 NULL 다중 허용)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS artists_artist_id_uniq
  ON artists (artist_id) WHERE artist_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS artists_kakao_id_uniq
  ON artists (kakao_id) WHERE kakao_id IS NOT NULL;

-- email은 대소문자 무시 UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS artists_email_lower_uniq
  ON artists (lower(email)) WHERE email IS NOT NULL;

-- ============================================================
-- 4. users 테이블 anon SELECT 정책 제거 (PII 보호)
--    앱은 service_role 키로만 접근하므로 영향 없음.
-- ============================================================
DROP POLICY IF EXISTS "users_select_public" ON users;

-- ============================================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_artists_set_updated_at ON artists;
CREATE TRIGGER trg_artists_set_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 완료 후 재검증
-- ============================================================
SELECT 'closed_dates format after migration' AS check,
  CASE
    WHEN artist_id LIKE 'rec%' THEN 'recordId'
    WHEN artist_id LIKE 'artist_%' THEN 'artistCode'
    ELSE 'other'
  END AS format,
  COUNT(*) AS n
FROM closed_dates
GROUP BY 1;

-- ============================================================
-- 롤백 가이드 (필요 시)
-- ============================================================
-- DROP INDEX IF EXISTS artists_artist_id_uniq;
-- DROP INDEX IF EXISTS artists_kakao_id_uniq;
-- DROP INDEX IF EXISTS artists_email_lower_uniq;
-- DROP TRIGGER IF EXISTS trg_artists_set_updated_at ON artists;
-- DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
-- DROP FUNCTION IF EXISTS set_updated_at();
-- CREATE POLICY "users_select_public" ON users FOR SELECT USING (true);
-- closed_dates.artist_id 재맵핑은 역연산 불가 (원본 artist_code 복원하려면 artists 테이블 JOIN 필요).
