# Mailable

> 행사 담당자를 위한 이메일 자동화 도구 — Google Sheets 참가자 명단을 연결하면 개인화된 이메일을 선택 발송할 수 있습니다.

- **기간**: 2025-10-03 ~ 현재
- **유형**: 개인 프로젝트
- **역할**: 기획 · 설계 · 풀스택 개발 전담
- **GitHub**: https://github.com/Jaek-Kein/Mailable

---

## 프로젝트 개요

세미나, 워크숍 등 행사를 운영하는 담당자가 Google Forms 응답 시트만 연결하면 참가자 명단을 자동으로 수집하고, 이메일 템플릿을 작성해 개인화된 메일을 발송할 수 있는 웹 애플리케이션입니다.

참가자별 발송 이력, 취소·체크인·입금 상태를 개별 관리하며, 이미 발송된 참가자는 별도 표시되어 중복 발송을 방지합니다. 모든 민감 정보(OAuth 토큰, Google Sheets URL, 참가자 payload)는 DB 저장 전 AES-256-GCM으로 암호화됩니다.

### 주요 기능

- **행사 등록**: 이름, 날짜, 장소, 포스터, Google Sheets URL 등록
- **참가자 명단 자동 수집**: Google Sheets CSV를 파싱해 이메일·이름·타임스탬프만 추출하여 저장 (계좌번호 등 민감 컬럼 제외)
- **이메일 템플릿 편집**: 행사별 제목·본문 인라인 편집, `{{이름}}` 등 플레이스홀더 치환
- **선택 발송**: 체크박스로 특정 참가자만 선택 발송, 미발송자 기본 선택 자동 적용
- **참가자 상태 관리**: 행별 취소·체크인·입금 상태 독립 토글 (row ID 기반, 동일 이메일 중복 신청 구분)
- **필드 레벨 암호화**: AES-256-GCM으로 OAuth 토큰, sheetUrl, payload를 DB 저장 전 암호화
- **발송 이력 추적**: 이메일 오픈 트래킹 픽셀, 참가자별 발송 상태 배지
- **포스터 업로드**: 클라이언트 Canvas API로 WebP 변환 후 Vercel Blob 업로드

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Language | TypeScript 6.x (strict mode) |
| Framework | Next.js 16.2 (App Router, Turbopack), React 19 |
| Styling | Emotion (CSS-in-JS, SSR), DM Serif Display + DM Sans |
| 상태 관리 | Zustand 5.x |
| Database | PostgreSQL (Neon) + Prisma 7.x |
| 인증 | NextAuth.js 4.x (Google OAuth, PrismaAdapter, database session) |
| 유효성 검사 | Zod 4.x |
| 이메일 발송 | Gmail API (googleapis 171.x, OAuth refresh_token 기반) |
| 파일 스토리지 | Vercel Blob |
| 외부 데이터 수집 | Google Sheets CSV export + csv-parse 6.x |
| QR / 체크인 | qrcode, @zxing/browser |
| 가상화 | @tanstack/react-virtual 3.x |
| Testing | Vitest 4.x, @testing-library/react, @testing-library/jest-dom |
| Tools | ESLint 10, pnpm, Prisma Studio |

---

## 아키텍처

- **레이어 구조**: Next.js App Router → API Route (인증/Zod 검증) → Prisma ORM → PostgreSQL
- **인증 방식**: Google OAuth 2.0 + NextAuth database session 전략 (JWT 미사용)
- **API 방식**: REST (Next.js Route Handlers)
- **배포 환경**: Vercel (Blob 스토리지 + Neon PostgreSQL 연동)
- **암호화**: `src/lib/crypto.ts` — AES-256-GCM 대칭 암호화, API 저장 전 encrypt / 응답 전 decrypt

---

### 주요 커밋 히스토리

| 시기 | 주요 작업 |
|------|-----------|
| 2025-10 | 프로젝트 초기 설정, 디자인 시스템, Navigation, EventCard, 대시보드 |
| 2025-10 | Google Sheets 수집 파이프라인, DB 연동, 데이터 fetch 시스템 |
| 2026-03 | 전체 로직 재설계 (logic 전체 재설계 wth claude code) |
| 2026-03 | 이메일 발송 시스템 (Gmail API), 발송 상태 추적, 참가자 체크인 시스템 |
| 2026-03 | 취소자 처리, 캠페인 개념 삭제 및 UX 단순화 |
| 2026-03 | 포스터 업로드 (서버 sharp → 클라이언트 Canvas WebP), 포스터 표시 |
| 2026-03 | 성능 최적화 3단계 (Zustand 선택자 분리, React.memo, 참가자 테이블 가상화) |
| 2026-03 | 필드 레벨 암호화 도입, 미들웨어 무한루프 수정 |
| 2026-03 | 행사 진행 여부 칩, Dashboard 정렬, README 작성 |

---

## 트러블슈팅 & 기술적 도전

### NextAuth database session + withAuth 미들웨어 무한 리디렉트 루프

**상황**
`withAuth` 미들웨어를 사용해 미인증 사용자를 `/login`으로 리디렉트하는 보호 라우트를 구성했을 때, 로그인 후에도 대시보드 진입 시 무한 루프가 발생했다.

**원인**
NextAuth `withAuth`의 내부 `getToken()`은 JWT 전략을 전제하고 동작한다. 이 프로젝트는 `strategy: "database"`로 설정되어 있어 JWT 토큰이 없으므로 `getToken()`이 항상 `null`을 반환했고, 결과적으로 인증된 세션이 있어도 `/login`으로 계속 리디렉트되었다.

**해결**
`withAuth`를 제거하고 `middleware.ts`에서 `next-auth.session-token` / `__Secure-next-auth.session-token` 쿠키 존재 여부를 직접 확인하는 방식으로 교체했다.

```ts
// 변경 후
const sessionToken =
  request.cookies.get("next-auth.session-token") ??
  request.cookies.get("__Secure-next-auth.session-token");

if (!sessionToken) {
  return NextResponse.redirect(new URL("/login", request.url));
}
```

**배운 점**
NextAuth의 헬퍼 미들웨어는 내부적으로 특정 세션 전략을 가정한다. 프레임워크 제공 유틸을 사용하기 전에 전략 호환성을 확인해야 하며, 인증 미들웨어가 제대로 동작하지 않을 때는 내부 동작 원리부터 추적하는 것이 효율적이다.

---

### Vercel 파일 업로드 제한 우회 — 서버 사이드 이미지 변환에서 클라이언트 Canvas API로 전환

**상황**
포스터 이미지 업로드 기능 구현 시 서버에서 `sharp`로 WebP 변환 후 Vercel Blob에 저장하는 방식을 사용했다. 원본 이미지(최대 10MB)를 서버로 직접 전송하면 Vercel의 요청 본문 크기 제한(4.5MB)에 걸려 `413 Error`가 발생했다. (커밋: `fix: size limit`, `fix: 400 bad request`)

**원인**
Vercel 서버리스 함수는 요청 본문 크기를 4.5MB로 제한한다. 원본 이미지를 FormData로 서버에 전송한 뒤 변환하는 구조 자체가 이 제한을 피할 수 없는 흐름이었다.

**해결**
이미지 변환 책임을 서버에서 클라이언트로 이동시켰다. 브라우저의 Canvas API로 클라이언트 측에서 WebP 변환(최대 800px, 품질 80%, 미지원 시 PNG 폴백)을 수행한 뒤, 변환된 소용량 파일(~200–400KB)만 서버로 전송한다.

```
원본(최대 10MB) → Canvas.toBlob(WebP) → ~200–400KB → POST /api/upload/poster → Vercel Blob
```

**배운 점**
서버리스 환경에서 파일 처리는 서버의 제약 조건을 먼저 파악해야 한다. 변환 비용이 낮은 작업은 클라이언트로 옮기면 서버 제한을 우회하는 동시에 서버 CPU 사용량도 줄일 수 있다.

---

### React Hooks 규칙 위반으로 인한 런타임 에러 (#310)

**상황**
참가자 테이블 가상화(`@tanstack/react-virtual`) 적용 후, 발송 버튼 클릭 시 React 런타임 에러 #310이 발생했다. 에러는 "Rendered more hooks than during the previous render" 메시지를 동반했다.

**원인**
`useCallback`으로 정의한 `handleSend`가 early return (`if (loading) return ...`) 이후에 선언되어 있었다. 로딩 상태에 따라 훅 호출 순서가 달라지면서 React 훅 규칙을 위반했다.

**해결**
`handleSend`를 포함한 모든 훅 선언을 컴포넌트 내 early return 이전으로 이동시켰다.

**배운 점**
React 훅은 조건부 실행이나 early return 이후에 위치할 수 없다. 컴포넌트에 early return이 존재할 경우 훅 선언 위치를 파일 상단부에 모아두는 패턴을 일관되게 유지해야 한다.

---

### 참가자 테이블 렌더링 성능 — 3단계 순차 최적화

**상황**
참가자 수가 많아질 경우 행사 상세 페이지에서 렌더링 지연이 발생할 수 있는 구조였다. 이메일 발송 모달 상태 변경 시에도 전체 페이지가 리렌더되는 문제가 있었다.

**원인**
(1) Zustand 스토어를 통째로 구독해 관련 없는 상태 변경에도 리렌더 발생, (2) `EventCard`가 memo되지 않아 부모 리렌더 시 모두 재렌더, (3) 참가자 테이블이 DOM에 모든 행을 마운트하는 구조.

**해결**
순차적으로 세 단계로 개선했다:
1. **Zustand 선택자 분리** (`ab95028`): `useEventStore((s) => s.events)`처럼 필요한 값만 구독, `useMemo`로 파생 값 계산 위치를 early return 앞으로 이동
2. **React.memo + 컴포넌트 분리** (`a258cce`): `EventCard`에 `React.memo` 적용, `TemplateEditor`·`CampaignModal`을 별도 컴포넌트로 분리
3. **참가자 테이블 가상화** (`43e4408`): `@tanstack/react-virtual`로 화면에 보이는 행만 DOM에 마운트 (estimateSize: 37px, overscan: 5)

**배운 점**
성능 최적화는 측정 가능한 병목부터 순서대로 접근하는 것이 효과적이다. 전역 상태 구독 방식 하나만 바꿔도 불필요한 리렌더의 상당 부분을 제거할 수 있다.

---

## 회고

### 잘된 점

- 처음부터 디자인 시스템(색상 토큰, 폰트 변수)을 정의해 전체 UI에 일관성을 유지할 수 있었다
- 참가자 row에 `_rid`(UUID)를 부여하는 방식으로 동일 이메일 중복 신청도 행 단위로 독립 관리할 수 있게 설계했다
- 성능 최적화를 후반부에 집중적으로 3단계로 진행해 구조적 개선과 가시적 결과를 함께 얻었다
- 필드 레벨 암호화를 API 레이어에 일괄 적용해 기존 로직 변경 없이 보안 요구사항을 충족했다

### 아쉬운 점 / 개선 여지

- 커밋 메시지가 일관된 컨벤션 없이 작성된 구간이 있어 히스토리 추적이 어렵다
- 중반부에 전체 로직을 재설계한 이력이 있는데, 초기 설계 단계에서 더 충분히 고민했다면 피할 수 있었을 작업이었다
- 이메일 발송 결과 확인이 현재 오픈 트래킹 픽셀에 한정되며, 클릭 트래킹은 미구현 상태다

### 다음에 적용할 것

- 커밋 초기부터 `feat:` / `fix:` / `chore:` 컨벤션 적용
- 참가자 수 기준 가상화 임계값(예: 100건 이상일 때만 활성화) 조건부 적용 검토
- 발송 예약 기능 (`scheduledAt` 필드는 스키마에 이미 존재)

---

## 성과 & 지표

> ⚠️ 아래 항목은 운영 데이터가 필요합니다. 직접 채워넣어 주세요.

- **사용자 수**: _(직접 입력)_
- **성능 지표**: _(직접 입력 — 예: p95 응답시간, 최대 참가자 처리 건수 등)_
- **기타**: _(직접 입력)_

---

_생성일: 2026-03-26_
