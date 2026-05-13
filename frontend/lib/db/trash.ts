"use server";

import { eq, asc, desc, isNotNull, lt } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { reports, reportAttachments } from "@/lib/db/schema";
import type {
  AttachmentKind,
  ReportAttachment,
} from "@/lib/report-types";
import {
  TRASH_RETENTION_DAYS,
  type TrashItem,
  type TrashedReport,
  type TrashedAttachment,
} from "@/lib/trash-types";

const RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/* ─── 휴지통 항목 조회 ──────────────────────────────── */
export async function listTrashed(): Promise<TrashItem[]> {
  const reportRows = await db
    .select({
      id: reports.id,
      title: reports.title,
      year: reports.year,
      month: reports.month,
      weekInMonth: reports.weekInMonth,
      dateStart: reports.dateStart,
      dateEnd: reports.dateEnd,
      deletedAt: reports.deletedAt,
    })
    .from(reports)
    .where(isNotNull(reports.deletedAt))
    .orderBy(desc(reports.deletedAt));

  const attRows = await db
    .select({
      id: reportAttachments.id,
      reportId: reportAttachments.reportId,
      kind: reportAttachments.kind,
      filename: reportAttachments.filename,
      size: reportAttachments.size,
      deletedAt: reportAttachments.deletedAt,
      reportTitle: reports.title,
      reportDeletedAt: reports.deletedAt,
    })
    .from(reportAttachments)
    .leftJoin(reports, eq(reportAttachments.reportId, reports.id))
    .where(isNotNull(reportAttachments.deletedAt))
    .orderBy(desc(reportAttachments.deletedAt));

  const reportItems: TrashedReport[] = reportRows.map((r) => ({
    kind: "report",
    id: r.id,
    title: r.title || `${r.weekInMonth ?? ""}주차`,
    range: rangeFromDates(r.dateStart, r.dateEnd),
    year: r.year,
    month: r.month,
    weekInMonth: r.weekInMonth,
    deletedAt: r.deletedAt!.toISOString(),
  }));

  // 보고서 자체가 휴지통이면 그 보고서의 첨부는 휴지통 목록에 별도 표시하지 않음 (보고서 복원 시 같이 살아남)
  const attItems: TrashedAttachment[] = attRows
    .filter((a) => a.reportDeletedAt === null)
    .map((a) => ({
      kind: "attachment",
      id: a.id,
      reportId: a.reportId,
      reportTitle: a.reportTitle,
      attachmentKind: a.kind as AttachmentKind,
      filename: a.filename,
      size: a.size,
      deletedAt: a.deletedAt!.toISOString(),
    }));

  return [...reportItems, ...attItems].sort((x, y) =>
    y.deletedAt.localeCompare(x.deletedAt),
  );
}

/* ─── 영구 삭제 (보고서) ─────────────────────────────── */
export async function purgeReport(id: string): Promise<void> {
  // 보고서에 묶인 첨부들의 Blob 모두 삭제 후 cascade로 row 제거
  const atts = await db
    .select({ blobUrl: reportAttachments.blobUrl })
    .from(reportAttachments)
    .where(eq(reportAttachments.reportId, id));

  if (atts.length > 0) {
    try {
      await del(atts.map((a) => a.blobUrl));
    } catch (err) {
      console.error("[purgeReport:blob]", err);
    }
  }

  await db.delete(reports).where(eq(reports.id, id));
}

/* ─── 영구 삭제 (첨부) ───────────────────────────────── */
export async function purgeAttachment(id: string): Promise<void> {
  const [row] = await db
    .select({ blobUrl: reportAttachments.blobUrl })
    .from(reportAttachments)
    .where(eq(reportAttachments.id, id))
    .limit(1);
  if (!row) return;

  try {
    await del(row.blobUrl);
  } catch (err) {
    console.error("[purgeAttachment:blob]", err);
  }
  await db.delete(reportAttachments).where(eq(reportAttachments.id, id));
}

/* ─── 만료 항목 자동 정리 (30일 경과분) ────────────── */
export async function purgeExpired(): Promise<{
  reports: number;
  attachments: number;
}> {
  const cutoff = new Date(Date.now() - RETENTION_MS);

  // 만료된 첨부 (보고서 단위 영구삭제와는 별개)
  const expiredAtts = await db
    .select({
      id: reportAttachments.id,
      blobUrl: reportAttachments.blobUrl,
    })
    .from(reportAttachments)
    .where(
      // deletedAt < cutoff
      // (deletedAt IS NOT NULL이라는 의미가 포함됨: lt 비교에서 NULL은 제외)
      lt(reportAttachments.deletedAt, cutoff),
    );

  for (const a of expiredAtts) {
    try {
      await del(a.blobUrl);
    } catch (err) {
      console.error("[purgeExpired:blob]", err);
    }
    await db
      .delete(reportAttachments)
      .where(eq(reportAttachments.id, a.id));
  }

  // 만료된 보고서: 보고서 row 삭제 시 FK CASCADE로 연결된 첨부 row가 함께 사라짐
  // → 첨부 Blob도 함께 정리
  const expiredReports = await db
    .select({ id: reports.id })
    .from(reports)
    .where(lt(reports.deletedAt, cutoff));

  for (const r of expiredReports) {
    const atts = await db
      .select({ blobUrl: reportAttachments.blobUrl })
      .from(reportAttachments)
      .where(eq(reportAttachments.reportId, r.id));
    if (atts.length > 0) {
      try {
        await del(atts.map((x) => x.blobUrl));
      } catch (err) {
        console.error("[purgeExpired:blob:report]", err);
      }
    }
    await db.delete(reports).where(eq(reports.id, r.id));
  }

  return {
    reports: expiredReports.length,
    attachments: expiredAtts.length,
  };
}

/* ─── 보고서 단위로 첨부도 같이 살리기/지우기 위한 헬퍼 ─── */
export async function listAttachmentsIncludingTrashed(
  reportId: string,
): Promise<ReportAttachment[]> {
  const rows = await db
    .select()
    .from(reportAttachments)
    .where(eq(reportAttachments.reportId, reportId))
    .orderBy(asc(reportAttachments.sortOrder));
  return rows.map((row) => ({
    id: row.id,
    reportId: row.reportId,
    kind: row.kind as AttachmentKind,
    filename: row.filename,
    contentType: row.contentType,
    size: row.size,
    blobUrl: row.blobUrl,
    blobPathname: row.blobPathname,
    sortOrder: row.sortOrder,
    uploadedAt: row.uploadedAt.toISOString(),
  }));
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
