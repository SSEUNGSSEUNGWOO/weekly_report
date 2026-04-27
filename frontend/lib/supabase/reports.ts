import { createClient } from "@/lib/supabase/client";
import {
  type WeeklyReport,
  type DiscussionRow,
  type MiscRow,
  type ProgramArea,
  type ProgramAreaKey,
} from "@/lib/report-types";
import type { Week } from "@/components/app-sidebar";

const sb = () => createClient();

type ReportRow = {
  id: string;
  year: number;
  month: number;
  week_in_month: number;
  week_index: number;
  title: string;
  date_start: string | null;
  date_end: string | null;
  report_date: string | null;
  discussions: DiscussionRow[] | null;
  areas: Record<ProgramAreaKey, ProgramArea> | null;
  miscs: MiscRow[] | null;
  status: "empty" | "draft" | "submitted";
  created_at: string;
  updated_at: string;
};

const EMPTY_AREAS: Record<ProgramAreaKey, ProgramArea> = {
  general: { result: "", plans: [] },
  expert: { result: "", plans: [] },
  champion: { result: "", plans: [] },
  consulting: { result: "", plans: [] },
  diagnosis: { result: "", plans: [] },
  system: { result: "", plans: [] },
};

/* ─── 목록 조회 (사이드바용) ──────────────────────────── */
export async function listWeeks(): Promise<Week[]> {
  const { data, error } = await sb()
    .from("reports")
    .select(
      "id, year, month, week_in_month, week_index, title, date_start, date_end, status",
    )
    .order("year", { ascending: true })
    .order("month", { ascending: true })
    .order("week_in_month", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id as string,
    year: r.year as number,
    month: r.month as number,
    weekInMonth: r.week_in_month as number,
    weekIndex: r.week_index as number,
    title: (r.title as string) || `${r.week_in_month}주차`,
    range: rangeFromDates(r.date_start, r.date_end),
    status: r.status as Week["status"],
  }));
}

/* ─── 단일 보고서 조회 ────────────────────────────────── */
export async function getReport(id: string): Promise<WeeklyReport | null> {
  const { data, error } = await sb()
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return rowToReport(data as ReportRow);
}

/* ─── 보고서 저장 (insert/update) ─────────────────────── */
export async function upsertReport(
  report: WeeklyReport,
  week: Week,
): Promise<void> {
  const row = {
    id: report.id,
    year: week.year,
    month: week.month,
    week_in_month: week.weekInMonth,
    week_index: week.weekIndex,
    title: report.meta.title,
    date_start: report.meta.dateStart || null,
    date_end: report.meta.dateEnd || null,
    report_date: report.meta.reportDate || null,
    discussions: report.discussions,
    areas: report.areas,
    miscs: report.miscs,
    status: week.status,
  };

  const { error } = await sb().from("reports").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

/* ─── 새 주차 생성 ────────────────────────────────────── */
type CreateWeekInput = {
  year: number;
  month: number;
  weekInMonth: number;
  weekIndex: number;
  title?: string;
  dateStart?: string;
  dateEnd?: string;
};

export async function createWeek(
  input: CreateWeekInput,
): Promise<{ week: Week; report: WeeklyReport }> {
  const { data, error } = await sb()
    .from("reports")
    .insert({
      year: input.year,
      month: input.month,
      week_in_month: input.weekInMonth,
      week_index: input.weekIndex,
      title: input.title ?? `${input.weekInMonth}주차`,
      date_start: input.dateStart ?? null,
      date_end: input.dateEnd ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  const row = data as ReportRow;
  const report = rowToReport(row);
  const week: Week = {
    id: row.id,
    year: row.year,
    month: row.month,
    weekInMonth: row.week_in_month,
    weekIndex: row.week_index,
    title: row.title || `${row.week_in_month}주차`,
    range: rangeFromDates(row.date_start, row.date_end),
    status: row.status,
  };
  return { week, report };
}

/* ─── 보고서 삭제 ─────────────────────────────────────── */
export async function deleteReport(id: string): Promise<void> {
  const { error } = await sb().from("reports").delete().eq("id", id);
  if (error) throw error;
}

/* ─── 헬퍼 ────────────────────────────────────────────── */
function rowToReport(row: ReportRow): WeeklyReport {
  return {
    id: row.id,
    meta: {
      weekIndex: row.week_index,
      title: row.title ?? "",
      dateStart: row.date_start ?? "",
      dateEnd: row.date_end ?? "",
      reportDate: row.report_date ?? "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    discussions: row.discussions ?? [],
    // 빈 객체 또는 일부 키만 있는 경우에도 6개 부문 모두 보장
    areas: { ...EMPTY_AREAS, ...(row.areas ?? {}) },
    miscs: row.miscs ?? [],
  };
}

function rangeFromDates(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  const fmt = (iso: string | null): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}.${d.getDate()}`;
  };
  return `${fmt(start)} — ${fmt(end)}`;
}
