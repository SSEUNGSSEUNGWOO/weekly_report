"use client";

import { useEffect, useState } from "react";
import {
  Trash2,
  RotateCcw,
  FileText,
  Paperclip,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listTrashed, purgeReport, purgeAttachment } from "@/lib/db/trash";
import { TRASH_RETENTION_DAYS, type TrashItem } from "@/lib/trash-types";
import { restoreReport } from "@/lib/db/reports";
import { restoreAttachment } from "@/lib/db/attachments";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored?: () => void; // 복원 후 부모 데이터 갱신
};

export function TrashDialog({ open, onOpenChange, onRestored }: Props) {
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listTrashed();
        if (!cancelled) setItems(list);
      } catch (err) {
        console.error("[listTrashed]", err);
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const refresh = async () => {
    try {
      const list = await listTrashed();
      setItems(list);
    } catch (err) {
      console.error("[listTrashed:refresh]", err);
    }
  };

  const handleRestore = async (item: TrashItem) => {
    setBusyId(item.id);
    try {
      if (item.kind === "report") {
        await restoreReport(item.id);
        toast.success(`"${item.title}" 보고서를 복원했습니다`);
      } else {
        await restoreAttachment(item.id);
        toast.success(`"${item.filename}"을(를) 복원했습니다`);
      }
      await refresh();
      onRestored?.();
    } catch (err) {
      console.error("[restore]", err);
      toast.error("복원에 실패했습니다");
    } finally {
      setBusyId(null);
    }
  };

  const handlePurge = async (item: TrashItem) => {
    if (
      !confirm(
        item.kind === "report"
          ? `"${item.title}" 보고서를 영구 삭제하시겠습니까?\n복구할 수 없습니다.`
          : `"${item.filename}"을(를) 영구 삭제하시겠습니까?\n복구할 수 없습니다.`,
      )
    )
      return;

    setBusyId(item.id);
    try {
      if (item.kind === "report") {
        await purgeReport(item.id);
      } else {
        await purgeAttachment(item.id);
      }
      toast.success("영구 삭제했습니다");
      await refresh();
    } catch (err) {
      console.error("[purge]", err);
      toast.error("삭제에 실패했습니다");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-[18px]">
            <Trash2 className="size-4 text-muted-foreground" strokeWidth={1.75} />
            휴지통
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-[1.7]">
            삭제된 항목은 <strong className="text-foreground">{TRASH_RETENTION_DAYS}일 후 자동으로 영구 삭제</strong>됩니다. 그 전에는 언제든 복원할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto">
          {items === null ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="font-mono text-[11px]">불러오는 중…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center font-mono text-[11.5px] text-muted-foreground">
              휴지통이 비어있습니다.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-2.5 text-[12.5px]"
                >
                  {item.kind === "report" ? (
                    <FileText
                      className="size-4 shrink-0 text-primary"
                      strokeWidth={1.75}
                    />
                  ) : (
                    <Paperclip
                      className="size-4 shrink-0 text-muted-foreground"
                      strokeWidth={1.75}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {item.kind === "report"
                        ? item.title
                        : item.filename}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[10.5px] text-muted-foreground">
                      {item.kind === "report" ? (
                        <>
                          <span>보고서</span>
                          <span>·</span>
                          <span>{item.range}</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {item.attachmentKind === "minutes"
                              ? "회의록 첨부"
                              : "파일 첨부"}
                          </span>
                          {item.reportTitle && (
                            <>
                              <span>·</span>
                              <span className="truncate">
                                {item.reportTitle}
                              </span>
                            </>
                          )}
                        </>
                      )}
                      <span>·</span>
                      <span>{daysLeft(item.deletedAt)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(item)}
                      disabled={busyId === item.id}
                      className="h-7 gap-1 px-2 text-[11.5px]"
                      title="복원"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw
                          className="size-3.5"
                          strokeWidth={2}
                        />
                      )}
                      복원
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePurge(item)}
                      disabled={busyId === item.id}
                      className="h-7 gap-1 px-2 text-[11.5px] text-muted-foreground hover:text-destructive"
                      title="영구 삭제"
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                      영구삭제
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function daysLeft(deletedAtIso: string): string {
  const deletedAt = new Date(deletedAtIso).getTime();
  const expireAt = deletedAt + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const remaining = expireAt - Date.now();
  if (remaining <= 0) return "곧 영구 삭제";
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  return `${days}일 남음`;
}
