-- 행정안전부 AI·데이터기반행정 역량강화 사업 주간업무보고
-- reports 테이블: 보고서 1행 = 메타 + 본문(JSONB)

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),

  -- 주차 메타
  year          int  not null,
  month         int  not null check (month between 1 and 12),
  week_in_month int  not null check (week_in_month between 1 and 6),
  week_index    int  not null unique,

  -- 보고서 헤더
  title         text not null default '',
  date_start    date,
  date_end      date,
  report_date   date,

  -- 본문 (JSONB)
  discussions   jsonb not null default '[]'::jsonb,
  areas         jsonb not null default '{}'::jsonb,
  miscs         jsonb not null default '[]'::jsonb,

  -- 상태
  status        text not null default 'empty'
                check (status in ('empty', 'draft', 'submitted')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists reports_week_index_idx on public.reports (week_index);
create index if not exists reports_year_month_idx on public.reports (year, month);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

-- RLS 비활성 (인증 도입 전 데모 단계)
alter table public.reports disable row level security;

-- anon role에 모든 권한 부여 (RLS 비활성이라도 명시적 grant)
grant all on public.reports to anon, authenticated;
