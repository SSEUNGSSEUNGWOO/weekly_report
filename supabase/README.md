# Supabase

행정안전부 AI·데이터기반행정 역량강화 사업 주간보고 시스템의 Supabase 디렉토리.

- 프로젝트 URL: `https://vivjixyaqicryuqwfuit.supabase.co`
- 클라이언트 코드: `frontend/lib/supabase/`
- 환경 변수: `frontend/.env.local`

## 디렉토리 구조

```
supabase/
├── migrations/   # SQL 마이그레이션 파일
└── README.md
```

## 마이그레이션 적용

스키마 작성 후 클라우드에 반영하려면 Supabase Studio의 SQL Editor에서 직접 실행하거나,
Supabase CLI를 사용:

```bash
npx supabase login
npx supabase link --project-ref vivjixyaqicryuqwfuit
npx supabase db push
```
