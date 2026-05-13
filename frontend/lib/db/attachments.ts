"use server";

import { eq, asc, and, isNull } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { reportAttachments } from "@/lib/db/schema";
import type {
  ReportAttachment,
  AttachmentKind,
} from "@/lib/report-types";

/* ─── 목록 조회 ──────────────────────────────────────── */
export async function listAttachments(
  reportId: string,
): Promise<ReportAttachment[]> {
  const rows = await db
    .select()
    .from(reportAttachments)
    .where(
      and(
        eq(reportAttachments.reportId, reportId),
        isNull(reportAttachments.deletedAt),
      ),
    )
    .orderBy(asc(reportAttachments.sortOrder), asc(reportAttachments.uploadedAt));

  return rows.map(rowToAttachment);
}

/* ─── 업로드 ─────────────────────────────────────────── */
export async function addAttachment(
  reportId: string,
  kind: AttachmentKind,
  formData: FormData,
): Promise<ReportAttachment> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("file 필드가 필요합니다");
  }

  const MAX_BYTES = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_BYTES) {
    throw new Error(
      `파일 크기는 50MB 이하여야 합니다 (현재 ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    );
  }

  const safeName = file.name.replace(/[\\/:*?"<>|]/g, "_");
  const pathname = `reports/${reportId}/${kind}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || undefined,
  });

  // 같은 kind의 마지막 sortOrder + 1 (휴지통 항목 포함, 충돌 방지)
  const existing = await db
    .select({ sortOrder: reportAttachments.sortOrder })
    .from(reportAttachments)
    .where(
      and(
        eq(reportAttachments.reportId, reportId),
        eq(reportAttachments.kind, kind),
      ),
    );
  const nextSort =
    existing.length === 0
      ? 0
      : Math.max(...existing.map((r) => r.sortOrder)) + 1;

  const [row] = await db
    .insert(reportAttachments)
    .values({
      reportId,
      kind,
      filename: file.name,
      contentType: file.type || "",
      size: file.size,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      sortOrder: nextSort,
    })
    .returning();

  return rowToAttachment(row);
}

/* ─── 소프트 삭제 ────────────────────────────────────── */
export async function deleteAttachment(id: string): Promise<void> {
  await db
    .update(reportAttachments)
    .set({ deletedAt: new Date() })
    .where(eq(reportAttachments.id, id));
}

/* ─── 복원 ───────────────────────────────────────────── */
export async function restoreAttachment(id: string): Promise<void> {
  await db
    .update(reportAttachments)
    .set({ deletedAt: null })
    .where(eq(reportAttachments.id, id));
}

/* ─── 헬퍼 ───────────────────────────────────────────── */
function rowToAttachment(
  row: typeof reportAttachments.$inferSelect,
): ReportAttachment {
  return {
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
  };
}
