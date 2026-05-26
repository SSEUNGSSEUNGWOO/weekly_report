# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 주간업무보고 프로젝트 가이드

행정안전부 AI·데이터기반행정 역량강화 사업 주간업무보고 작성 시스템.

## 디렉토리 구조

```
weekly_report/
├── frontend/      Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui
└── mockup/        초기 디자인 mockup HTML (참고용, 빌드 미포함)
```

> 모든 작업은 `frontend/` 안에서 이루어진다. 루트에서 명령을 실행하지 않는다.

## 명령어

```bash
cd frontend
npm install
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드 (TS + Turbopack)
npm run start        # 빌드 결과물 실행
npm run lint         # ESLint (eslint-config-next)
```

DB 마이그레이션은 `drizzle-kit` 직접 호출(예: `npx drizzle-kit push`, `npx drizzle-kit generate`). package.json에 script로 등록돼 있지 않다. 설정은 `frontend/drizzle.config.ts`.

테스트 러너는 설치돼 있지 않다. 빌드 검증은 `npm run build`로 한다.

## 핵심 스택 (⚠ Next.js 16 — 학습 데이터와 다름)

`frontend/AGENTS.md`의 경고: **"This is NOT the Next.js you know"**. API·컨벤션·파일 구조가 모두 다를 수 있다. 코드 작성 전에 `frontend/node_modules/next/dist/docs/`의 가이드를 확인하고 deprecation 경고를 무시하지 않는다.

대표 차이점:
- `middleware.ts` → **`proxy.ts`**, 함수명도 `proxy` (`frontend/proxy.ts` 참조)
- `next.config.ts` 사용, Turbopack 기본

다른 스택:
- **React 19**
- **Tailwind CSS v4** — `@theme inline` 문법, 토큰은 `frontend/app/globals.css`
- **shadcn/ui** — `components/ui/`. 추가 시 `npx shadcn@latest add <name> --yes` (prompt 회피)
- **Neon + Drizzle ORM** — `@neondatabase/serverless` + `drizzle-orm/neon-http`
- **Vercel Blob** — 첨부 파일 저장소 (`@vercel/blob`)
- **sonner** — 토스트 알림 (`Toaster`는 `app/layout.tsx`에 마운트)

## 환경변수 (`frontend/.env.local`)

```
DATABASE_URL=postgresql://...        # Neon 접속 문자열
ACCESS_CODE=...                       # 입장 게이트 비밀번호
BLOB_READ_WRITE_TOKEN=...             # Vercel Blob 스토어 토큰
```

`.env.local`은 `.gitignore`에 있다 — **커밋 금지**. 형식은 `frontend/.env.example` 참조.

## 아키텍처 — 상태와 데이터 흐름

이 앱의 "큰 그림"은 다음 한 줄로 요약된다: **`Workspace`가 모든 상태를 들고, DB 레이어는 서버 액션으로 호출되며, 자동저장은 600ms debounce이다.**

### 1. 진입과 인증 게이트

```
요청 → proxy.ts(쿠키 access_granted=yes 확인) → 미인증이면 /lock으로 리다이렉트
                                              → 인증되면 / (app/page.tsx → <Workspace/>)
```

- `frontend/proxy.ts`: `access_granted` 쿠키가 없으면 모든 비공개 경로를 `/lock`으로 보낸다. 공개 경로는 `/lock`과 `/api/auth/*` 뿐.
- `frontend/app/api/auth/route.ts`: `POST {code}`로 `ACCESS_CODE` 일치 시 httpOnly 세션 쿠키 발급. `DELETE`로 로그아웃.

### 2. 중앙 상태 — `components/workspace.tsx`

`Workspace` 클라이언트 컴포넌트가 단일 진실의 원천이다. 핵심 상태:

| 상태 | 역할 |
|---|---|
| `weeks` | 사이드바 트리에 표시되는 주차 목록 (목록 조회 1회) |
| `reports` | `{ [reportId]: WeeklyReport }` — 활성화될 때 lazy fetch |
| `attachmentsByReport` | `{ [reportId]: ReportAttachment[] }` — 활성화 시점에 lazy fetch |
| `activeId` | 현재 편집/미리보기 중인 주차 ID |
| `mode` | `"edit" | "preview"` — 미리보기는 PDF 출력용 |
| `saveStatus` | `"idle" | "saving" | "saved"` — 헤더 인디케이터 |

다른 컴포넌트는 이 상태를 props로 받아서 표시·편집만 한다.

### 3. 자동저장

`updateActiveReport`가 호출되면:
1. 메모리 상태 즉시 갱신 (낙관적)
2. `saveStatus = "saving"`
3. 기존 debounce 타이머 취소 → 600ms 후 `upsertReport`로 flush
4. 성공 시 `"saved"`

추가로 `Cmd/Ctrl + S`는 debounce를 우회해 즉시 저장한다. 컴포넌트 unmount 시 펜딩 타이머는 정리하지만 강제 flush는 하지 않는다.

### 4. 데이터 레이어 컨벤션 — `"use server"`

`frontend/lib/db/*.ts`는 **전부 파일 최상단에 `"use server"` 디렉티브를 둔다**. 클라이언트 컴포넌트(`Workspace`, 폼들)가 이 함수들을 직접 `await`해서 호출 → Next.js가 서버 액션으로 처리.

- `lib/db/index.ts` — `db` 클라이언트 (Neon HTTP)
- `lib/db/reports.ts` — `listWeeks`, `getReport`, `upsertReport`, `createWeek`, `deleteReport`(soft), `restoreReport`
- `lib/db/attachments.ts` — `listAttachments`, `addAttachment`(Blob 업로드), `removeAttachment`(soft)
- `lib/db/roadmap.ts` — 연간 로드맵 CRUD
- `lib/db/trash.ts` — `listTrashed`, `restoreItem`, `permanentlyDelete`, `purgeExpired` (30일 보존)

> 새 DB 함수를 추가할 때 `"use server"`를 빠뜨리면 클라이언트 번들에 DB 코드와 `DATABASE_URL`이 노출된다. 반드시 첫 줄에 명시.

### 5. 스키마 — `frontend/lib/db/schema.ts`

3개 테이블:
- `reports` — 보고서 본문. `discussions/areas/miscs`는 jsonb. soft delete (`deletedAt`).
- `report_attachments` — Vercel Blob에 올린 파일 메타. `kind` IN `('minutes','file')`. soft delete.
- `roadmap_items` — 연간 로드맵 (월별 × 카테고리). 1~12월 check 제약.

소프트 삭제 패턴: `deletedAt`이 NULL이면 활성, 값이 있으면 휴지통. `purgeExpired`가 30일 지난 항목을 진짜 삭제하며 Blob도 같이 정리한다. `Workspace` 첫 로드 시 백그라운드로 1회 호출 (실패해도 본 로드는 진행).

### 6. 보고서 데이터 모델 — `frontend/lib/report-types.ts`

`WeeklyReport`는 4개 섹션으로 구성:
- `meta` — 주차 번호·날짜
- `discussions` — 주요 논의사항 (행 배열)
- `areas` — 6개 사업 부문(`general/expert/champion/consulting/diagnosis/system`)의 `result` + `plans[]`. `PROGRAM_AREAS` 상수가 표시 순서·라벨의 단일 출처.
- `miscs` — 기타 사항. `MISC_TYPES`, `MISC_STATUSES` 상수가 enum 역할.

부문 키나 misc enum을 바꾸면 이 파일이 단일 진입점이다.

### 7. 컴포넌트 레이아웃

```
<SidebarProvider>
  <AppSidebar/>              ← 주차 트리, 새 보고서, 휴지통
  <SidebarInset>
    <SiteHeader/>            ← 모드 토글, 저장 상태, PDF 버튼
    <main>
      ReportForm | ReportPreview | Hero(+AnnualRoadmap)
    </main>
  </SidebarInset>
</SidebarProvider>
```

`ReportForm`은 섹션별로 분리: `meta-fields`, `section-discussion`, `section-progress`, `section-misc`, `section-attachments` (`components/report-form/`).

### 8. PDF 출력

`SiteHeader`의 PDF 버튼 → `mode = "preview"` 설정 후 200ms 뒤 `window.print()`. Tailwind `print:` 변형으로 인쇄 스타일 처리. `.preview-mode` 클래스가 body에 붙어 행안부 공문서 톤(흑백 + 네이비 강조)으로 변환된다.

## 색상 토큰 (행안부 신뢰감 톤)

`frontend/app/globals.css`에 정의:

| 변수 | 값 | 비고 |
|---|---|---|
| `--primary` | `#003478` | 행정안전부 공식 네이비 |
| `--ring` | `#003478` | 포커스 링 |
| `--success` | `#15803D` | 저장됨 표시 등 |
| `--destructive` | `#B91C1C` | 삭제/위험 |

## 폰트

- **Pretendard** (sans) — `globals.css`에서 jsDelivr CDN으로 import
- **Noto Serif KR** (serif, 헤딩) — `next/font/google`로 self-host (`app/layout.tsx`)
- **JetBrains Mono** (mono) — `next/font/google`로 self-host

> Pretendard도 self-host로 옮기려면 `pretendard` npm 패키지 + `next/font/local` 사용.

## 작업 규칙

- 한국어 라벨/문구는 행정 톤(겸양체, 정확한 명사) 유지
- mock 데이터는 컴포넌트 내부 상수로만, 실데이터는 DB에서
- 새 shadcn 컴포넌트 추가 시 `--yes`/`-d` 옵션으로 prompt 회피
- DB 함수 신설 시 파일 첫 줄 `"use server"` 필수
- Next.js 16 deprecation 경고가 뜨면 무시하지 말고 docs 확인
- 빌드 검증: `npm run build`
