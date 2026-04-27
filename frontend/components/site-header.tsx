"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Download, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TodayClock } from "@/components/today-clock";

export type Mode = "edit" | "preview";
export type SaveStatus = "idle" | "saving" | "saved";

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onJumpThisWeek?: () => void;
  onGoHome?: () => void;
  saveStatus?: SaveStatus;
  onExportPdf?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  canExport?: boolean;
  hasActive?: boolean;
};

export function SiteHeader({
  mode,
  onModeChange,
  onJumpThisWeek,
  onGoHome,
  saveStatus = "idle",
  onExportPdf,
  onSave,
  onDelete,
  canExport = true,
  hasActive = false,
}: Props) {
  useEffect(() => {
    document.body.classList.toggle("preview-mode", mode === "preview");
    return () => document.body.classList.remove("preview-mode");
  }, [mode]);

  return (
    <header className="grid h-[60px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border bg-background px-4 print:hidden sm:px-6">
      {/* 좌측 그룹 */}
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="size-8" />
        <Separator orientation="vertical" className="h-6" />

        <button
          type="button"
          onClick={onGoHome}
          title="홈으로 이동"
          className="flex shrink-0 items-center rounded-md px-1.5 py-1 -mx-1.5 transition-colors hover:bg-accent"
        >
          <Image
            src="/k-brain-logo.png"
            alt="K-Brain"
            width={3233}
            height={1326}
            priority
            className="h-7 w-auto"
          />
        </button>
      </div>

      {/* 가운데 — 시계 */}
      <div className="flex items-center justify-center">
        <TodayClock onClick={onJumpThisWeek} />
      </div>

      {/* 우측 그룹 */}
      <div className="flex items-center justify-end gap-2">
        <div className="inline-flex rounded-md border border-border bg-secondary p-[3px]">
          {(["edit", "preview"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`rounded-[4px] px-3.5 py-1.5 text-[12px] font-semibold tracking-[-0.01em] transition-colors ${
                mode === m
                  ? "bg-background text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {m === "edit" ? "편집" : "미리보기"}
            </button>
          ))}
        </div>

        <SaveIndicator status={saveStatus} />

        {hasActive && onSave && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={saveStatus === "saving"}
            className="ml-1 h-[30px] gap-1.5"
            title="Cmd+S / Ctrl+S"
          >
            <Save className="size-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">저장</span>
          </Button>
        )}

        <Button
          size="sm"
          onClick={onExportPdf}
          disabled={!canExport}
          className="h-[30px] gap-1.5"
        >
          <Download className="size-3.5" strokeWidth={2} />
          <span className="hidden sm:inline">PDF 내보내기</span>
        </Button>

        {hasActive && onDelete && (
          <>
            <Separator orientation="vertical" className="ml-1 h-6" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-[30px] gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">삭제</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") {
    return <span className="ml-1 hidden w-[60px] sm:block" aria-hidden />;
  }

  const dotClass =
    status === "saving"
      ? "bg-primary animate-pulse"
      : "bg-success";

  const label = status === "saving" ? "저장 중…" : "저장됨";

  return (
    <span className="ml-1 hidden w-[60px] items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground sm:inline-flex">
      <span className={`size-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
