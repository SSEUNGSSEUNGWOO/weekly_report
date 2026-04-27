# 주간업무보고 시스템

행정안전부 AI·데이터기반행정 역량강화 사업 주간업무보고 작성 도구.

## 빠른 시작

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속.

## 스택

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **DB / Auth**: Supabase (클라우드)
- **폰트**: Pretendard, Noto Serif KR, JetBrains Mono
- **테마**: 행안부 공식 네이비 `#003478` 기반 신뢰감 톤

## 환경 변수

`frontend/.env.local` 파일 필요:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

(`.env.example` 참조)

## 디렉토리

```
weekly_report/
├── frontend/      Next.js 앱
├── supabase/      DB 마이그레이션
├── mockup/        초기 디자인 mockup (참고용)
└── CLAUDE.md      프로젝트 작업 가이드
```
