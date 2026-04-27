# 주간업무보고 프로젝트 가이드

행정안전부 AI·데이터기반행정 역량강화 사업 주간업무보고 작성 시스템.

## 디렉토리 구조

```
weekly_report/
├── frontend/      Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui
├── supabase/      DB 마이그레이션 / 가이드 (클라우드 프로젝트 연결)
├── mockup/        초기 디자인 mockup HTML (참고용, 빌드에 미포함)
└── 2026_주간보고_템플릿.html   원본 행안부 공문서 템플릿 (참고용)
```

## 개발 시작

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

## 핵심 스택

- **Next.js 16.2.4** — App Router. ⚠ Next.js 16부터 `middleware.ts` → `proxy.ts`로 이름 변경됨. 함수명도 `proxy`.
- **React 19**
- **Tailwind CSS v4** — `@theme inline` 문법, `globals.css`에서 토큰 정의
- **shadcn/ui** — `components/ui/` 디렉토리. 추가 컴포넌트는 `npx shadcn@latest add <name>`
- **Supabase** — `@supabase/ssr` 사용. 클라우드 프로젝트 (URL: `vivjixyaqicryuqwfuit`)

## 색상 토큰 (행안부 신뢰감 톤)

`frontend/app/globals.css`에 정의. 핵심 변수:

| 변수 | 값 | 비고 |
|---|---|---|
| `--primary` | `#003478` | 행정안전부 공식 네이비 |
| `--ring` | `#003478` | 포커스 링 |
| `--success` | `#15803D` | 저장됨 표시 등 |
| `--destructive` | `#B91C1C` | 삭제/위험 |

`.preview-mode` 클래스가 `body`에 붙으면 행안부 공문서 톤(흑백 + 네이비 강조)으로 변환됨. 모드 토글은 `components/site-header.tsx`에서 처리.

## 폰트

- **Pretendard** (sans) — `globals.css`에서 jsDelivr CDN으로 import
- **Noto Serif KR** (serif, 헤딩) — `next/font/google`로 self-host
- **JetBrains Mono** (mono) — `next/font/google`로 self-host

> Pretendard도 self-host로 옮기려면 `pretendard` npm 패키지 + `next/font/local` 사용.

## 컴포넌트 구조

```
components/
├── site-header.tsx    상단 헤더 (로고, 모드 토글, PDF 버튼)
├── week-tabs.tsx      주차 칩 가로 스크롤 + 새 보고서 추가
├── meta-panel.tsx     우측 정보 패널 (lg 이상에서만 표시)
└── ui/                shadcn 컴포넌트
```

레이아웃: 상단 헤더 → 주차 탭 → 좌(메인 캔버스) + 우(메타 패널). 사이드바 없음.

## Supabase 사용

```ts
// 클라이언트 컴포넌트
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// 서버 컴포넌트 / 액션
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

`.env.local`에 URL과 anon key. **커밋 금지** (이미 `.gitignore`에 포함됨).

세션 갱신은 `frontend/proxy.ts`가 담당 (Next.js 16의 proxy 컨벤션).

## 작업 규칙

- 모든 한국어 라벨/문구는 행정 톤(겸양체, 정확한 명사) 유지
- mock 데이터는 컴포넌트 내부 상수로만 두고, 실제 데이터는 Supabase에서
- 새 shadcn 컴포넌트 추가 시 `--yes` 또는 `-d` 옵션으로 prompt 회피
- 빌드 검증: `npm run build` (TypeScript + Turbopack)
