-- DayPic Phase 4.x Hardening — view SECURITY INVOKER + users FK
-- 2026-04-22
--
-- 목표:
--   [Critical] artists_public 뷰에 security_invoker=on 설정. 지정 안 하면
--              PostgreSQL은 뷰를 소유자(service_role 가능) 권한으로 실행해
--              anon이 REVOKE된 artists 테이블을 우회 조회 가능.
--   [Medium]   artists.user_id → users.id FK 추가 (데이터 드리프트 방지)
--
-- 멱등.

-- ============================================================
-- 1. artists_public 뷰 보안 강화
-- ============================================================
-- 기존 뷰 옵션 변경
ALTER VIEW artists_public SET (security_invoker = on);

-- 검증
SELECT 'artists_public security_invoker' AS check, reloptions
FROM pg_class
WHERE relname = 'artists_public' AND relkind = 'v';

-- ============================================================
-- 2. artists.user_id FK — users(id)
--    현재 register 로직은 users upsert → artists insert 순서라
--    사실상 항상 정상이지만, 중간 drift 방지용 장치.
-- ============================================================
-- 2-1. 고아 user_id 확인 (artists.user_id가 users에 없는 경우)
SELECT 'orphan artists.user_id' AS check, a.id, a.user_id
FROM artists a
LEFT JOIN users u ON u.id = a.user_id
WHERE a.user_id IS NOT NULL AND u.id IS NULL;

-- 2-2. 있으면 먼저 처리 (주석 해제)
-- UPDATE artists SET user_id = NULL
-- WHERE user_id IS NOT NULL
--   AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = artists.user_id);

-- 2-3. FK 추가 (ON DELETE SET NULL — users 지워져도 artists는 남김)
ALTER TABLE artists
  DROP CONSTRAINT IF EXISTS artists_user_fk;

ALTER TABLE artists
  ADD CONSTRAINT artists_user_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE artists VALIDATE CONSTRAINT artists_user_fk;

-- ============================================================
-- 3. 검증
-- ============================================================
SELECT 'artists FK list' AS check, conname, confrelid::regclass AS refs
FROM pg_constraint
WHERE conrelid = 'artists'::regclass AND contype = 'f';

-- ============================================================
-- 롤백
-- ============================================================
-- ALTER VIEW artists_public SET (security_invoker = off);
-- ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_user_fk;
