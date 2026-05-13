"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Loader2, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type {
  AttachmentKind,
  ReportAttachment,
} from "@/lib/report-types";
import {
  addAttachment,
  deleteAttachment,
  restoreAttachment,
} from "@/lib/db/attachments";
import { SectionShell } from "./section-shell";

type Props = {
  reportId: string;
  index: string;            // "04" or "05"
  title: string;            // "회의록 첨부" or "파일 첨부"
  kind: AttachmentKind;
  attachments: ReportAttachment[];
  onChange: (next: ReportAttachment[]) => void;
};

export function SectionAttachments({
  reportId,
  index,
  title,
  kind,
  attachments,
  onChange,
}: Props) {
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 병렬 작업 중 stale closure 회피용 latest attachments
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setError(null);
    setUploading((prev) => [...prev, ...arr.map((f) => f.name)]);

    await Promise.all(
      arr.map(async (file) => {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const att = await addAttachment(reportId, kind, fd);
          onChange([...attachmentsRef.current, att]);
        } catch (e) {
          console.error("[addAttachment]", e);
          const msg = e instanceof Error ? e.message : "업로드 실패";
          setError(`${file.name}: ${msg}`);
        } finally {
          setUploading((prev) => prev.filter((n) => n !== file.name));
        }
      }),
    );
  };

  const remove = async (id: string) => {
    // 낙관적 업데이트 — UI 즉시 반영, 병렬 클릭 시에도 누락 없음
    const snapshot = attachmentsRef.current;
    const target = snapshot.find((a) => a.id === id);
    if (!target) return;

    onChange(snapshot.filter((a) => a.id !== id));
    try {
      await deleteAttachment(id);
      toast(`"${target.filename}"을(를) 휴지통으로 이동했습니다`, {
        description: "30일 후 자동으로 영구 삭제됩니다.",
        action: {
          label: "되돌리기",
          onClick: async () => {
            try {
              await restoreAttachment(id);
              onChange([...attachmentsRef.current, target]);
              toast.success(`"${target.filename}"을(를) 복원했습니다`);
            } catch (err) {
              console.error("[restoreAttachment]", err);
              toast.error("복원에 실패했습니다");
            }
          },
        },
      });
    } catch (e) {
      console.error("[deleteAttachment]", e);
      setError("첨부파일 삭제 실패");
      onChange(snapshot);
    }
  };

  return (
    <SectionShell index={index} title={title}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            uploadFiles(e.dataTransfer.files);
          }
        }}
        className={`relative flex flex-col gap-2 rounded-md border border-dashed p-3 transition-colors ${
          dragging
            ? "border-primary bg-primary/5 ring-2 ring-primary/30"
            : "border-border bg-muted/20"
        }`}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md font-mono text-[12px] font-medium text-primary">
            여기로 끌어다 놓으면 첨부됩니다
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            첨부파일
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="h-7 gap-1 px-2.5 text-[11.5px]"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            파일 추가
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {attachments.length === 0 && uploading.length === 0 ? (
          <p className="py-2 font-mono text-[11px] text-muted-foreground/70">
            파일을 끌어다 놓거나{" "}
            <span className="text-primary">파일 추가</span>를 누르세요. (파일당 최대 50MB)
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {attachments.map((a, idx) => (
              <li
                key={a.id}
                className="group/att flex items-center gap-2 py-1.5 text-[12.5px]"
              >
                <span className="shrink-0 font-mono text-[10.5px] font-medium text-muted-foreground tabular-nums">
                  첨부{idx + 1}.
                </span>
                <span
                  className="flex-1 truncate text-foreground"
                  title={a.filename}
                >
                  {a.filename}
                </span>
                <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground tabular-nums">
                  {formatBytes(a.size)}
                </span>
                <a
                  href={a.blobUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex size-6 items-center justify-center rounded text-muted-foreground/60 hover:text-primary"
                  aria-label="다운로드"
                  title="다운로드"
                >
                  <Download className="size-3.5" strokeWidth={1.75} />
                </a>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="inline-flex size-6 items-center justify-center rounded text-muted-foreground/60 hover:text-destructive"
                  aria-label="첨부파일 삭제"
                  title="삭제"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
            {uploading.map((name, i) => (
              <li
                key={`up-${name}-${i}`}
                className="flex items-center gap-2 py-1.5 text-[12.5px] text-muted-foreground"
              >
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                <span className="flex-1 truncate" title={name}>
                  {name}
                </span>
                <span className="shrink-0 font-mono text-[10.5px]">
                  업로드 중…
                </span>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-[11.5px] text-destructive">
            <AlertCircle className="size-3.5" strokeWidth={2} />
            {error}
          </p>
        )}
      </div>
    </SectionShell>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
