import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import {
  type WeeklyReport,
  type DiscussionRow,
  type MiscRow,
  type ProgramArea,
  type ProgramAreaKey,
} from "@/lib/report-types";
import type { Week } from "@/components/app-sidebar";

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
  const rows = await db
    .select({
      id: reports.id,
      year: reports.year,
      month: reports.month,
      weekInMonth: reports.weekInMonth,
      weekIndex: reports.weekIndex,
      title: reports.title,
      dateStart: reports.dateStart,
      dateEnd: reports.dateEnd,
      status: reports.status,
    })
    .from(reports)
    .orderBy(asc(reports.year), asc(reports.month), asc(reports.weekInMonth));

  return rows.map((r) => ({
    id: r.id,
    year: r.year!,
    month: r.month!,
    weekInMonth: r.weekInMonth!,
    weekIndex: r.weekIndex!,
    title: r.title || `${r.weekInMonth}주차`,
    range: rangeFromDates(r.dateStart, r.dateEnd),
    status: r.status as Week["status"],
  }));
}

/* ─── 단일 보고서 조회 ────────────────────────────────── */
export async function getReport(id: string): Promise<WeeklyReport | null> {
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  return rowToReport(rows[0]);
}

/* ─── 보고서 저장 (insert/update) ─────────────────────── */
export async function upsertReport(
  report: WeeklyReport,
  week: Week,
): Promise<void> {
  await db
    .insert(reports)
    .values({
      id: report.id,
      year: week.year,
      month: week.month,
      weekInMonth: week.weekInMonth,
      weekIndex: week.weekIndex,
      title: report.meta.title,
      dateStart: report.meta.dateStart || null,
      dateEnd: report.meta.dateEnd || null,
      reportDate: report.meta.reportDate || null,
      discussions: report.discussions,
      areas: report.areas,
      miscs: report.miscs,
      status: week.status,
    })
    .onConflictDoUpdate({
      target: reports.id,
      set: {
        year: sql`excluded.year`,
        month: sql`excluded.month`,
        weekInMonth: sql`excluded.week_in_month`,
        weekIndex: sql`excluded.week_index`,
        title: sql`excluded.title`,
        dateStart: sql`excluded.date_start`,
        dateEnd: sql`excluded.date_end`,
        reportDate: sql`excluded.report_date`,
        discussions: sql`excluded.discussions`,
        areas: sql`excluded.areas`,
        miscs: sql`excluded.miscs`,
        status: sql`excluded.status`,
        updatedAt: sql`now()`,
      },
    });
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
  const [row] = await db
    .insert(reports)
    .values({
      year: input.year,
      month: input.month,
      weekInMonth: input.weekInMonth,
      weekIndex: input.weekIndex,
      title: input.title ?? `${input.weekInMonth}주차`,
      dateStart: input.dateStart ?? null,
      dateEnd: input.dateEnd ?? null,
    })
    .returning();

  const report = rowToReport(row);
  const week: Week = {
    id: row.id,
    year: row.year!,
    month: row.month!,
    weekInMonth: row.weekInMonth!,
    weekIndex: row.weekIndex!,
    title: row.title || `${row.weekInMonth}주차`,
    range: rangeFromDates(row.dateStart, row.dateEnd),
    status: row.status as Week["status"],
  };
  return { week, report };
}

/* ─── 보고서 삭제 ─────────────────────────────────────── */
export async function deleteReport(id: string): Promise<void> {
  await db.delete(reports).where(eq(reports.id, id));
}

/* ─── 헬퍼 ────────────────────────────────────────────── */
function rowToReport(row: typeof reports.$inferSelect): WeeklyReport {
  return {
    id: row.id,
    meta: {
      weekIndex: row.weekIndex!,
      title: row.title ?? "",
      dateStart: row.dateStart ?? "",
      dateEnd: row.dateEnd ?? "",
      reportDate: row.reportDate ?? "",
      createdAt: row.createdAt?.toISOString() ?? "",
      updatedAt: row.updatedAt?.toISOString() ?? "",
    },
    discussions: (row.discussions as DiscussionRow[]) ?? [],
    areas: {
      ...EMPTY_AREAS,
      ...((row.areas as Record<ProgramAreaKey, ProgramArea>) ?? {}),
    },
    miscs: (row.miscs as MiscRow[]) ?? [],
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
