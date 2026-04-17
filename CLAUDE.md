# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개발 명령어

```bash
npm run dev      # 개발 서버 실행 (포트 3001)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 실행
```

## 프로젝트 개요

웨딩 사진작가 매칭 플랫폼. 사용자가 특정 날짜에 촬영 가능한 사진작가를 검색하고, 사진작가는 자신의 포트폴리오와 휴무일을 관리할 수 있다.

## 기술 스택

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** - 인라인 유틸리티 클래스만 사용, 별도 CSS 파일 없음
- **NextAuth.js** - 카카오 OAuth 로그인
- **Airtable** - 주 데이터베이스 (REST API)
- **Cloudinary** - 이미지 업로드

## 아키텍처

### 디렉토리 구조
```
app/
├── api/                   # API Route Handlers
│   ├── auth/[...nextauth] # 카카오 OAuth
│   ├── search/            # 사진작가 검색 (핵심 기능)
│   ├── me/                # 현재 유저/작가 프로필
│   ├── artists/           # 작가 CRUD, 포트폴리오, 대표이미지
│   ├── cloudinary/sign/   # 이미지 업로드 서명
│   └── artist-closed/     # 작가 휴무일 관리
├── components/
│   └── Header.tsx
└── [페이지들]/             # search, artists/[id], artist-dashboard, mypage 등
```

### 핵심 데이터 흐름 (검색)

```
사용자 입력 (날짜, 서비스, 지역, 가격)
    ↓
/search/page.tsx (클라이언트)
    ↓
GET /api/search?date=&region=&service=
    ↓
Airtable에서 artists + closed_dates 조회
    ↓
필터링 (지역/서비스/가격/휴무일 제외)
    ↓
결과 셔플 후 반환
```

### 인증 흐름

- 카카오 로그인 → NextAuth JWT 콜백에서 Airtable user/artist 조회
- JWT에 `userId`, `artistId`, `kakaoId` 저장
- `/api/me`로 현재 세션 유저 정보 조회

### 클라이언트 상태 관리

- **localStorage**: `daypic_recent_artists`, `daypic_favorite_artists`, `daypic_artist_detail_cache`
- **sessionStorage**: `daypic_search_page_state` (검색 필터 + 스크롤 위치 복원)
- Redux/Zustand 없이 React 훅 + 브라우저 스토리지만 사용

## 환경 변수

`.env.local` 필요:
```
AIRTABLE_TOKEN=
AIRTABLE_BASE_ID=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## 코딩 컨벤션

- **Styled Components 없음** - Tailwind 유틸리티 클래스 직접 사용
- **주요 색상**: purple `#7b5cf6`, pink `#d75eb6`, dark `#2c2448`
- API는 `cache: "no-store"` fetch 사용
- Airtable 응답은 `fields` 객체에서 직접 파싱
- 이미지 URL은 Cloudinary 또는 Airtable attachment URL 배열로 관리
