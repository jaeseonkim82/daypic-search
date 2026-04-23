# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개발 명령어

```bash
npm run dev             # 개발 서버 실행 (포트 3001)
npm run build           # 프로덕션 빌드
npm run start           # 프로덕션 서버 실행
npm run lint            # ESLint 실행
```

## 프로젝트 개요

웨딩 사진작가 매칭 플랫폼. 사용자가 특정 날짜에 촬영 가능한 사진작가를 검색하고, 사진작가는 자신의 포트폴리오와 휴무일을 관리할 수 있다.

## 기술 스택

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** - 인라인 유틸리티 클래스만 사용, 별도 CSS 파일 없음
- **NextAuth.js** - 카카오 OAuth 로그인
- **Supabase (PostgreSQL)** - 주 데이터베이스. `@supabase/supabase-js` + `service_role` 키로 서버에서 직접 접근
- **Cloudinary** - 이미지 업로드 (서명 업로드)

> Airtable은 Phase 3에서 완전 폐기. 이관 스크립트·헬퍼·잔존 attachment URL 모두 정리 완료 (Phase 4.2 끝단).

## 아키텍처

### 디렉토리 구조
```
app/
├── api/                   # API Route Handlers (모두 Supabase 단독)
│   ├── auth/[...nextauth] # 카카오 OAuth, JWT 콜백에서 users/artists Supabase upsert
│   ├── search/            # 사진작가 검색 (service_role, closed_dates JOIN 아닌 in-memory exclude)
│   ├── me/                # 현재 유저/작가 프로필 (dbError 플래그 포함)
│   ├── artists/           # CRUD (register/[id]/by-email/portfolio-images/representative-image/video-portfolio)
│   ├── cloudinary/sign/   # 이미지 업로드 서명 (작가 세션 필수, folder allowlist)
│   ├── artist-closed/     # 작가 휴무일 (GET/POST/DELETE, idempotent)
│   └── health/            # GET: Supabase 연결/주요 테이블 ping (200/503)
├── components/
│   └── Header.tsx
└── [페이지들]/             # search, artists/[id], artist-dashboard, mypage, artist-profile/edit 등

lib/
├── supabase.ts            # getSupabaseAdmin (service_role) + ArtistRow/UserRow/ClosedDateRow 타입
├── artist-lookup.ts       # findArtistRow: id 포맷 정규식 분기로 4종 식별자 지원
├── auth-helpers.ts        # getAuthSession, requireArtistOwner (PATCH 권한 체크)
├── date-utils.ts          # formatDateToYMD 공통 헬퍼
├── error-response.ts      # serverError 헬퍼 (프로덕션에서 DB 에러 상세 숨김)
└── ids.ts                 # makeRecordId / makeArtistCode (crypto.randomBytes)

supabase/
├── schema.sql             # 신규 환경 bootstrap용 스냅샷
└── migrations/
    ├── 001_hotfix_phase_3_5.sql       # closed_dates.artist_id 재맵핑, UNIQUE 인덱스, updated_at 트리거
    ├── 002_phase_4_1_cleanup.sql      # keywords 제거, closed_dates 죽은 컬럼 제거, FK+CASCADE
    ├── 003_orphan_fix_and_retry.sql   # 002 FK 추가 실패한 환경용 복구(artist_rec 혼종)
    ├── 004_hardening.sql              # artists_public view + anon revoke, UNIQUE(artist_id, closed_date)
    ├── 005_phase_4_2_video_expand.sql # video_portfolio_items 신규 + 동기화 트리거
    ├── 006_view_security_and_user_fk.sql # view security_invoker, artists.user_id FK
    └── 007_phase_4_2_contract_drop.sql # artists.video_* DROP + 동기화 트리거/함수 제거 + artists_public 뷰 재생성
```

### 핵심 데이터 흐름 (검색)

```
사용자 입력 (날짜, 서비스, 지역, 가격)
    ↓
/search/page.tsx (클라이언트)
    ↓
GET /api/search?date=&region=&service=&price=
    ↓
supabase.from("artists").select("*")  (service_role)
    ↓
인메모리 필터링 (지역/서비스/가격)
    ↓
closed_dates 조회 후 휴무일 제외 (artist_id/id 양쪽 비교)
    ↓
Fisher-Yates 셔플 후 반환
```

### 인증 흐름

- 카카오 OAuth → NextAuth JWT 콜백에서 Supabase `users` upsert + `artists` 조회
- JWT에 `userId`, `artistId`(=artists.id, rec...), `kakaoId`, `dbError` 저장
- Supabase 장애로 upsert 실패 시 `token.dbError=true` → `/api/me`가 클라이언트에 노출 → mypage/artist-dashboard가 경고 배너
- 쓰기 API는 `requireArtistOwner`로 작가 소유자 검증 (session.kakaoId ↔ artist.kakao_id, 레거시 대비 email 폴백)

### 식별자 관례

- `artists.id` = `rec...` (PRIMARY KEY, 모든 FK 기준. 과거 Airtable recordID 형식 유지 — 현 시스템은 Supabase 단독)
- `artists.artist_id` = 자체 코드 `artist_xxx` (UNIQUE)
- `artists.user_id` → `users(id)` FK (ON DELETE SET NULL)
- `artists.kakao_id` = 카카오 숫자 ID (UNIQUE)
- `closed_dates.artist_id` → `artists(id)` FK (ON DELETE CASCADE). 반드시 recordId 포맷으로 저장.

### 클라이언트 상태 관리

- **localStorage**: `daypic_recent_artists`, `daypic_favorite_artists`, `daypic_artist_detail_cache`
- **sessionStorage**: `daypic_search_page_state` (검색 필터 + 스크롤 위치 복원)
- Redux/Zustand 없이 React 훅 + 브라우저 스토리지만 사용

### 낙관적 락 (선택적)

- `GET /api/artists/[id]` 응답에 `updated_at` 포함
- 저장 시 `PATCH`에 `expected_updated_at` 보내면 DB의 현재값과 비교. 불일치 시 `409` + `current_updated_at` 반환 → 클라이언트는 최신값을 반영해 재시도 유도
- 보내지 않으면 기존 경로

## 환경 변수

`.env.local` 필요:
```
# Supabase (primary)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # anon/publishable (현재 서버에서 미사용, 미래 RLS 전환 시 사용)
SUPABASE_SERVICE_ROLE_KEY=

# Auth
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3001

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## 코딩 컨벤션

- **Styled Components 없음** - Tailwind 유틸리티 클래스 직접 사용
- **주요 색상**: purple `#7b5cf6`, pink `#d75eb6`, dark `#2c2448`
- API는 `cache: "no-store"` fetch 사용
- 서버 라우트 에러는 `serverError(context, error, userMessage)` 헬퍼 경유 → 프로덕션에서 DB 상세 메시지 숨김
- 응답 포맷은 `{ ok: boolean, ... }` 기본. 일부 구 라우트는 `{ success: true }` 하위 호환 필드도 같이 반환 (클라이언트 전환 후 제거 예정)
- 이미지 URL은 Cloudinary 호스트만 기대 (포트폴리오 업로드)
- `success`/`성향키워드`/`keywords` 별칭은 `@deprecated` 표시. 클라이언트 전환 완료 후 제거 스케줄

## 완료된 주요 Phase

- **Phase 4.2 Contract (완료)**: video_link_1..4 / video_thumb_1..4 / video_thumbnail / video_style_tags 를 `video_portfolio_items` 관계 테이블로 전부 이관. artists 구 컬럼 DROP(007). PATCH 는 `{items:[{position,link,thumb}], style_tags}` 단일 스키마만 수용. 서버 응답은 `video_portfolio_items` 만 노출. 남아있던 Airtable URL도 Cloudinary 로 백필 후 Airtable 코드 완전 제거.

## 향후 작업 (참고)

- **레거시 별칭 정리**: 응답의 `keywords` / `성향키워드` 별칭을 `style_keywords` 단일 소스로 통일 (클라이언트 잔존 참조 확인 필요).
- **Phase 5 RLS**: NextAuth JWT → Supabase JWT 서명 교환 + `auth.jwt()->>'kakao_id'` 기반 RLS. service_role 의존을 webhook/cron 전용으로 축소.
- **Supabase 타입 자동 생성**: `supabase gen types typescript`로 `ArtistRow` 등 수동 타입 대체.
