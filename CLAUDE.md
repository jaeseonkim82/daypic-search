# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개발 명령어

```bash
npm run dev             # 개발 서버 실행 (포트 3001)
npm run build           # 프로덕션 빌드
npm run start           # 프로덕션 서버 실행
npm run lint            # ESLint 실행
npm run gen:types       # Supabase 스키마 → lib/database.types.ts 재생성
```

## 프로젝트 개요

웨딩 사진작가 매칭 플랫폼. 사용자가 특정 날짜에 촬영 가능한 사진작가를 검색하고, 사진작가는 자신의 포트폴리오와 휴무일을 관리할 수 있다.

**양면 사이트 성격** — 검색 도구이자 동시에 작가의 포트폴리오 사이트. 메인에 §6.0 "전체 작가 10인 쇼케이스" (weighted_random + `last_shown_at` 회전)로 모든 작가 공정 노출.

## 디자인 v4 기준 (2026-04-23 확정)

상세는 `docs/디자인.md` v4 (2472L) 참조. Claude Code 작업 시 다음 결정 사항을 항상 따른다:

- **반응형**: 단일 breakpoint `pc: 800px` 만 사용. 기본(모바일 <800) + `pc:` (PC ≥800) 2단 분기. `sm:`/`md:`/`lg:`/`xl:`/`2xl:` 사용 금지.
- **컨테이너**: `max-width 1400px` (`.container-primary` 단일 유틸리티). `padding-inline: clamp(16px, 4vw, 32px)`.
- **브랜드**: 숨고 컨셉 — Primary 보라 `#7B5CF6`, 화이트 배경, 그라디언트는 primary CTA hover 1군데로만.
- **타이포**: Pretendard 4 weight (Regular/Medium/SemiBold/Bold) static subset. `public/fonts/Pretendard-{Weight}.subset.woff2` 사전 설치 완료. 명조 페어링 안 함.
- **다크모드**: 미지원 (포트폴리오 감상 최적화).
- **`/mypage` 폴리모픽 유지**: 한 라우트, 내부 `isArtist` 분기로 신부 뷰 + 작가 뷰.
- **작가 모바일 하단 탭바** (Sprint 5 도입 예정): 작가 라우트 5개에 `pc:hidden` fixed bottom 64px 4탭 (대시보드/사진/영상/일정). `app/(artist)/layout.tsx` route group에서 단일 mount.
- **API Response Envelope 표준** (디자인.md §26): `{ ok, dbError?, error?: { code, message, fields? }, ...payload }`. `success` 키 폐기. Airtable shape leak (`record.fields.대표사진`) 정규화 schedule.
- **dbError 글로벌화** (Sprint 4): 모든 mutating endpoint가 `dbError?: boolean` 반환 → `app/components/state/DbErrorBannerGlobal.tsx`가 `app/layout.tsx`에 단일 mount.
- **Error Family** (Sprint 4 신설): `app/not-found.tsx`, `app/error.tsx`, `app/unauthorized/page.tsx`, route group별 `loading.tsx`.
- **Auth State Machine** (디자인.md §19): `anonymous / authed_bride / authed_artist_pending / authed_artist_active / suspended` 5-state. `pending`/`active` 구분은 마이그레이션 010에서 도입.

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
SUPABASE_ACCESS_TOKEN=                  # `npm run gen:types` 실행시에만 필요 (개발용)

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

### 스타일링 (Sprint 1 hard cut 대상)
- **Styled Components 없음** — Tailwind 유틸리티 클래스 직접 사용
- **반응형 prefix는 `pc:` 만**. `sm:`/`md:`/`lg:`/`xl:`/`2xl:` 사용 시 ESLint 차단 (Sprint 1).
- **하드코딩 hex 금지** — 디자인.md §2 토큰 (`text-fg-default`, `bg-primary`, `border-border-default` 등) 사용. 색상 매핑표는 §2.4. Sprint 1 종료 시점 0건.
- **컨테이너 폭**은 `.container-primary` (max-width 1400px) 유틸리티만 사용. 직접 max-w 지정 금지.

### 폼·피드백 (Sprint 1 hard cut 대상)
- **`alert()` 사용 금지** — `sonner`의 `toast.{success,error,info,warning,loading}` 만 사용. Sprint 1 종료 시점 0건.
- **자체 드롭다운 구현 금지** — `MultiSelectDropdown`/`SingleSelectDropdown` 같은 자체 구현 대신 `app/components/ui/Select.tsx` (Radix Select 기반) 단일 컴포넌트 사용. Sprint 1에 통합.
- **폼 검증**은 `react-hook-form` + `zod` + `app/components/ui/Form.tsx` 패턴. helper 영역 `min-h-6` 항상 reserved (CLS 0).

### API 계약
- API는 `cache: "no-store"` fetch 사용
- 서버 라우트 에러는 `serverError(context, error, userMessage)` 헬퍼 경유 → 프로덕션에서 DB 상세 메시지 숨김
- **응답 envelope 표준** (디자인.md §26): `{ ok: boolean, dbError?: boolean, error?: { code, message, fields? }, ...payload }`. 신규 라우트는 이 형식 필수. 기존 라우트의 `success` 키는 deprecated, Sprint 4에서 일괄 폐기.
- **dbError**: 모든 mutating endpoint가 Supabase 장애 시 `dbError: true` 반환. 글로벌 `DbErrorBannerGlobal` 가 자동 표시.
- 클라 → 서버 fetch는 v4의 `lib/api/fetcher.ts` `apiFetch` wrapper 경유 (Sprint 4 도입). 직접 `fetch()` 잔존 0건이 Sprint 5 DoD.
- 이미지 URL은 Cloudinary 호스트만 기대 (포트폴리오 업로드)
- `success`/`성향키워드`/`keywords` 별칭은 `@deprecated` 표시. 클라이언트 전환 완료 후 제거 스케줄

### 컴포넌트
- 새 페이지·섹션 작성 시 디자인.md §22.x Page Spec 4 섹션(Designer/PM/PO/Implementation) + 상태 매트릭스 7~8 상태(Loading/Empty/Error/dbError/Auth401/403/404/409) 부합 검증.
- 모바일 다중선택은 BottomSheet 80vh 패턴 (디자인.md §23.6).
- 작가 라우트 본문 하단 padding은 `pb-[80px]` (모바일 탭바 64 + safe area 가림 방지).

## 완료된 주요 Phase

- **Phase 4.2 Contract (완료)**: video_link_1..4 / video_thumb_1..4 / video_thumbnail / video_style_tags 를 `video_portfolio_items` 관계 테이블로 전부 이관. artists 구 컬럼 DROP(007). PATCH 는 `{items:[{position,link,thumb}], style_tags}` 단일 스키마만 수용. 서버 응답은 `video_portfolio_items` 만 노출. 남아있던 Airtable URL도 Cloudinary 로 백필 후 Airtable 코드 완전 제거.

## v4 Sprint 진행 (디자인.md §12 + §28)

총 9~10주 (~2.3 인월) 계획. 단계별 DoD는 디자인.md 참조.

### Sprint 1 (12d, hard-cut 포함) — 측정·기반·공급측 + 도구 일원화
- `app/globals.css` Arial 라인 삭제 + 다크 미디어 쿼리 제거 + `@theme` 토큰 60+종 정의 + `--breakpoint-pc: 800px` + `.container-primary { max-width: 1400px }`
- `app/layout.tsx` Pretendard 4 weight 로딩 (`next/font/local`, `public/fonts/`) + MotionConfig + Sonner Toaster mount
- `app/components/artist/ArtistCard.tsx` 추출, 페이지 3곳 교체
- 마이그레이션 008 (`testimonials JSONB` + `price_min/max INT` + `rating` NULL 허용) 적용
- 작가 편집 "대표 이미지 지정" + "testimonials 3건 입력" UI
- 이벤트 1~5 + 14 prod 발사 (디자인.md §15.5)
- **hard cut**: alert() 0건 + 커스텀 드롭다운 0건 + 하드코딩 hex 0건 + ESLint 회귀 차단

### Sprint 2 (2주) — 신부 랜딩 + 탐색 퍼널 + §6.0 쇼케이스
- Hero 1+3+1 비대칭 모자이크 + 모바일 BottomSheet 검색
- 카테고리 8개 (Lucide placeholder → 자체 일러스트)
- §6.0 전체 작가 10인 쇼케이스 + `/api/artists/showcase` ISR
- 마이그레이션 009 (`artists.last_shown_at` + 회전 인덱스)
- /search 카드 교체 + Skeleton/Empty 신설 + 이벤트 #15·#17 신규
- §20 작가 CTA 배너 (메인 섹션 #4)
- 10% 캐너리 → 30% rollout

### Sprint 3 (2주) — 상세·헤더·실험 운영
- /artists/[id] 토큰 + Lightbox swipe + 모바일 sticky CTA + breadcrumb
- Header 3+1 + 모바일 햄버거 시트 (Radix Dialog + Framer Motion)
- /artist-dashboard Sonner 전환 + 대표 이미지 reminder 배너
- Hero A/B 실험 ID 등록 + 30% → 100% rollout

### Sprint 4 (2주, 신설 v4) — 신부 보조 + Error Family + API 정리
- /mypage 폴리모픽 정리 (신부 뷰 찜 그리드 + 작가 뷰 통계 placeholder)
- /checklist autosave + alert→toast + confetti + html2canvas lazy
- /tips 카드형 + 콘텐츠 감사 (≥24 항목 미달 시 강등)
- /login Suspense Skeleton + 카카오 fail toast + next param 안전 검증
- **Error Family 4종**: `not-found.tsx`, `error.tsx`, `unauthorized/page.tsx`, route group별 `loading.tsx`
- **DbErrorBanner 글로벌화** + `lib/api/fetcher.ts` `apiFetch` wrapper + DbErrorBus
- API envelope 1차 정리 (`success` 키 폐기 + Airtable shape leak 정규화)

### Sprint 5 (2주, 신설 v4) — 작가 스위트 통합 개편
- `app/(artist)/layout.tsx` route group + 모바일 ArtistTabBar mount + 가드 통합
- /artist-register react-hook-form + zod 전면 재작성 + 인라인 검증 + 모바일 Sheet
- /artist-dashboard 통계 API (`/api/artists/[id]/stats`) + 4 통계 카드 + 4 액션 카드
- /artist-upload dropzone + progress UI + 대표 이미지 강조
- /artist-calendar ARIA grid + 키보드 네비 + 모바일 sticky Action
- /video-upload 4 슬롯 wizard + 1:1 매핑 명시
- /artist-profile/edit 409 OptLock UI + autosave + testimonials 입력
- 마이그레이션 010 (`artists.status ENUM('pending','active','suspended')`)

## 그 외 향후 작업 (참고)

- **레거시 별칭 정리**: 응답의 `keywords` / `성향키워드` 별칭을 `style_keywords` 단일 소스로 통일 (클라이언트 잔존 참조 확인 필요)
- **Phase 5 RLS**: NextAuth JWT → Supabase JWT 서명 교환 + `auth.jwt()->>'kakao_id'` 기반 RLS. service_role 의존을 webhook/cron 전용으로 축소
- **CI 에서 types drift 체크**: `npm run gen:types` 로 만든 `lib/database.types.ts` 가 스키마와 항상 일치하는지 확인하는 CI step 검토
- **Phase 6 백로그**: 신부 비교 패널 / 작가 통계 상세(일별 노출 그래프) / 검색 무한 스크롤 / Sentry + Lighthouse CI + size-limit / pricing tier

## 참조 문서

- **`docs/디자인.md`** v4 (2472L, 2026-04-23) — UI/UX/레이아웃/Sprint 진행/이벤트 스키마 단일 진실원
  - §3.6 반응형 정책 (pc:800px) / §3.5 컨테이너 (1400) / §6.0 쇼케이스 / §10 메인 섹션 순서 / §17.1 확정 결정 6건
  - §18 IA / §19 Auth State Machine / §22 페이지 스펙 14개 / §23 Form Catalog / §25 Mobile Patterns / §26 API Envelope / §28 Sprint 4·5
  - 부록 C 13×8 점검표 / 부록 D v3→v4 변경 요약
- **`docs/프로젝트구조.md`** — 페이지·API·Supabase 스키마·환경변수·인증 사실관계 (디자인.md cross-link)
