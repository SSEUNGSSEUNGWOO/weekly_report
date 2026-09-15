"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, type Week } from "@/components/app-sidebar";
import { ReportForm } from "@/components/report-form";
import { ReportPreview } from "@/components/report-preview";
import { SiteHeader, type Mode, type SaveStatus } from "@/components/site-header";
import { AnnualRoadmap } from "@/components/annual-roadmap";
import { TrashDialog } from "@/components/trash-dialog";
import {
  PROGRAM_AREAS,
  type WeeklyReport,
  type ReportAttachment,
} from "@/lib/report-types";
import { mergeReport } from "@/lib/report-merge";
import {
  listWeeks,
  getReport,
  upsertReport,
  createWeek,
  deleteReport,
  restoreReport,
} from "@/lib/db/reports";
import { listAttachments } from "@/lib/db/attachments";
import { purgeExpired } from "@/lib/db/trash";

type ThisWeekMeta = ReturnType<typeof thisWeekMeta>;

const SAVE_DEBOUNCE_MS = 600;

export function Workspace() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [reports, setReports] = useState<Record<string, WeeklyReport>>({});
  const [attachmentsByReport, setAttachmentsByReport] = useState<
    Record<string, ReportAttachment[]>
  >({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("edit");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [duplicateDialog, setDuplicateDialog] = useState<{
    meta: ThisWeekMeta;
    existing: Week;
    nextSuffixIndex: number;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Week | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // debounce 대기 중인 저장 (flush 시 즉시 실행)
  const pendingRef = useRef<{ report: WeeklyReport; week: Week } | null>(null);
  // 저장을 직렬화해 이전 저장의 updatedAt을 다음 저장이 반드시 사용하도록 함
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  // reportId → 마지막으로 서버가 돌려준 updatedAt (충돌 감지 기준)
  const knownUpdatedAtRef = useRef<Record<string, string>>({});
  // reportId → 마지막으로 서버가 확인해 준 보고서 (충돌 시 3자 병합의 base)
  const baseRef = useRef<Record<string, WeeklyReport>>({});

  /* ─── 첫 로드 ──────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 30일 지난 휴지통 항목 백그라운드 정리 (실패해도 본 로드는 진행)
        purgeExpired().catch((err) =>
          console.error("[purgeExpired]", err),
        );
        const list = await listWeeks();
        if (!cancelled) setWeeks(list);
      } catch (err) {
        console.error("[listWeeks]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ─── 활성 주차 변경 시 보고서 lazy fetch ─ */
  useEffect(() => {
    if (!activeId || reports[activeId]) return;
    let cancelled = false;
    (async () => {
      const r = await getReport(activeId);
      if (!cancelled && r) {
        baseRef.current[activeId] = r;
        setReports((prev) => ({ ...prev, [activeId]: r }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, reports]);

  /* ─── 활성 주차 변경 시 첨부 lazy fetch ─ */
  useEffect(() => {
    if (!activeId || attachmentsByReport[activeId]) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listAttachments(activeId);
        if (!cancelled) {
          setAttachmentsByReport((prev) => ({ ...prev, [activeId]: list }));
        }
      } catch (err) {
        console.error("[listAttachments]", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, attachmentsByReport]);

  const activeWeek = weeks.find((w) => w.id === activeId) ?? null;
  const activeReport = activeId ? (reports[activeId] ?? null) : null;
  const activeAttachments = activeId
    ? (attachmentsByReport[activeId] ?? [])
    : [];

  /* ─── 실제 DB 저장 (충돌 시 3자 병합 후 재시도) ─ */
  const saveOnce = async (report: WeeklyReport, week: Week, attempt: number) => {
    const expected =
      knownUpdatedAtRef.current[report.id] ?? report.meta.updatedAt ?? "";
    const result = await upsertReport(report, week, expected);
    if (result.ok) {
      knownUpdatedAtRef.current[report.id] = result.updatedAt;
      baseRef.current[report.id] = report;
      setSaveStatus("saved");
      return;
    }
    const { current } = result;
    if (current && attempt < 3) {
      const base = baseRef.current[report.id] ?? current;
      const mergeWith = (local: WeeklyReport) => mergeReport(base, local, current);
      const { merged, collisions } = mergeWith(report);
      knownUpdatedAtRef.current[report.id] = current.meta.updatedAt ?? "";
      baseRef.current[report.id] = current;
      // 화면·대기 중 저장은 이 스냅샷 이후의 타이핑을 담고 있을 수 있어 각각 병합
      setReports((prev) => ({
        ...prev,
        [report.id]: prev[report.id] ? mergeWith(prev[report.id]).merged : merged,
      }));
      if (pendingRef.current?.report.id === report.id) {
        pendingRef.current.report = mergeWith(pendingRef.current.report).merged;
      }
      if (collisions.length > 0) {
        toast.warning("다른 사용자와 같은 항목을 동시에 수정했습니다", {
          id: "save-collision",
          description: `${collisions.map(leafLabel).join(", ")} 항목은 내 입력을 유지했습니다. 상대방 내용을 확인해 주세요.`,
        });
      }
      return saveOnce(merged, week, attempt + 1);
    }
    setSaveStatus("error");
    toast.error("저장하지 못했습니다", {
      id: "save-conflict",
      duration: Infinity,
      description: current
        ? "다른 사용자의 저장과 계속 겹칩니다. 작성 중인 내용을 복사해 두고 새로고침한 뒤 다시 입력해 주세요."
        : "이 보고서가 삭제되었거나 찾을 수 없습니다. 작성 중인 내용을 복사해 두고 새로고침해 주세요.",
      action: { label: "새로고침", onClick: () => window.location.reload() },
    });
  };

  const persist = (report: WeeklyReport, week: Week) => {
    saveChainRef.current = saveChainRef.current.then(async () => {
      try {
        await saveOnce(report, week, 0);
      } catch (err) {
        console.error("[upsertReport]", err);
        setSaveStatus("error");
        toast.error("저장하지 못했습니다", {
          id: "save-error",
          description: "네트워크 상태를 확인한 뒤 Ctrl+S로 다시 저장해 주세요.",
        });
      }
    });
    return saveChainRef.current;
  };

  /* ─── 대기 중인 저장 즉시 실행 ─ */
  const flushPending = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) return persist(pending.report, pending.week);
    return saveChainRef.current;
  };

  /* ─── 입력 변경 → 메모리 업데이트 + debounce 저장 ─ */
  const updateActiveReport = (next: WeeklyReport) => {
    if (!activeWeek) return;

    setReports((prev) => ({ ...prev, [activeWeek.id]: next }));
    setSaveStatus("saving");

    pendingRef.current = { report: next, week: activeWeek };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushPending, SAVE_DEBOUNCE_MS);
  };

  /* ─── 실제 보고서 생성 ─────────────────────── */
  const actuallyCreate = async (meta: ThisWeekMeta, suffixIndex: number) => {
    const nextWeekIndex =
      weeks.length > 0
        ? Math.max(...weeks.map((w) => w.weekIndex)) + 1
        : 1;

    const baseTitle = `${meta.month}월 ${meta.weekInMonth}주차`;
    const title = suffixIndex > 1 ? `${baseTitle} (${suffixIndex})` : baseTitle;

    try {
      const { week, report } = await createWeek({
        year: meta.year,
        month: meta.month,
        weekInMonth: meta.weekInMonth,
        weekIndex: nextWeekIndex,
        title,
        dateStart: meta.dateStart,
        dateEnd: meta.dateEnd,
      });
      setWeeks((prev) => [...prev, week].sort(sortWeeks));
      baseRef.current[report.id] = report;
      setReports((prev) => ({ ...prev, [report.id]: report }));
      setAttachmentsByReport((prev) => ({ ...prev, [report.id]: [] }));
      setActiveId(week.id);
    } catch (err) {
      console.error("[createWeek]", err);
    }
  };

  /* ─── 새 보고서 생성 (오늘이 속한 주차 자동) ─ */
  const handleCreateNew = async () => {
    const meta = thisWeekMeta();

    const sameWeekReports = weeks.filter(
      (w) =>
        w.year === meta.year &&
        w.month === meta.month &&
        w.weekInMonth === meta.weekInMonth,
    );

    if (sameWeekReports.length > 0) {
      setDuplicateDialog({
        meta,
        existing: sameWeekReports[0],
        nextSuffixIndex: sameWeekReports.length + 1,
      });
      return;
    }

    await actuallyCreate(meta, 1);
  };

  const handleJumpThisWeek = () => {
    const meta = thisWeekMeta();
    const w = weeks.find(
      (w) =>
        w.year === meta.year &&
        w.month === meta.month &&
        w.weekInMonth === meta.weekInMonth,
    );
    if (w) setActiveId(w.id);
  };

  const handleGoHome = () => setActiveId(null);

  const handleConfirmDuplicate = async () => {
    if (!duplicateDialog) return;
    const { meta, nextSuffixIndex } = duplicateDialog;
    setDuplicateDialog(null);
    await actuallyCreate(meta, nextSuffixIndex);
  };

  const handleOpenExisting = () => {
    if (!duplicateDialog) return;
    setActiveId(duplicateDialog.existing.id);
    setDuplicateDialog(null);
  };

  /* ─── 수동 저장 ────────────────────────── */
  const handleSave = async () => {
    if (!activeWeek || !activeReport) return;
    setSaveStatus("saving");
    pendingRef.current ??= { report: activeReport, week: activeWeek };
    await flushPending();
  };

  /* ─── 삭제 요청 / 확인 ─────────────────── */
  const requestDelete = (week: Week) => setDeleteDialog(week);

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    const week = deleteDialog;
    setDeleteDialog(null);
    try {
      await deleteReport(week.id);
      // 메모리 캐시에서 즉시 제거 (DB는 soft delete 상태)
      setWeeks((prev) => prev.filter((w) => w.id !== week.id));
      setReports((prev) => {
        const next = { ...prev };
        delete next[week.id];
        return next;
      });
      setAttachmentsByReport((prev) => {
        const next = { ...prev };
        delete next[week.id];
        return next;
      });
      if (activeId === week.id) setActiveId(null);

      toast(`"${week.title}" 보고서를 휴지통으로 이동했습니다`, {
        description: "30일 후 자동으로 영구 삭제됩니다.",
        action: {
          label: "되돌리기",
          onClick: async () => {
            try {
              await restoreReport(week.id);
              setWeeks((prev) => [...prev, week].sort(sortWeeks));
              toast.success(`"${week.title}" 보고서를 복원했습니다`);
            } catch (err) {
              console.error("[restoreReport]", err);
              toast.error("복원에 실패했습니다");
            }
          },
        },
      });
    } catch (err) {
      console.error("[deleteReport]", err);
      toast.error("삭제에 실패했습니다");
    }
  };

  /* ─── 첨부 변경 (낙관적 업데이트) ─────────────────── */
  const updateActiveAttachments = (next: ReportAttachment[]) => {
    if (!activeWeek) return;
    setAttachmentsByReport((prev) => ({ ...prev, [activeWeek.id]: next }));
  };

  /* ─── 사이드바 트리: 다른 주차 펼침 시 lazy fetch ─ */
  const ensureAttachmentsLoaded = async (reportId: string) => {
    if (attachmentsByReport[reportId]) return;
    try {
      const list = await listAttachments(reportId);
      setAttachmentsByReport((prev) =>
        prev[reportId] ? prev : { ...prev, [reportId]: list },
      );
    } catch (err) {
      console.error("[listAttachments:expand]", err);
    }
  };

  /* ─── Cmd/Ctrl + S 단축키 ──────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeek, activeReport]);

  /* ─── PDF 내보내기 ─────────────────────── */
  const handleExportPdf = () => {
    setMode("preview");
    setTimeout(() => window.print(), 200);
  };

  /* ─── 주차 전환·unmount 시 펜딩 저장 즉시 flush ─ */
  useEffect(() => {
    return () => {
      flushPending();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  /* ─── 탭 닫기: 펜딩 저장 flush + 저장 중이면 이탈 경고 ─ */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const dirty =
        pendingRef.current !== null ||
        saveStatus === "saving" ||
        saveStatus === "error";
      flushPending();
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveStatus]);

  return (
    <SidebarProvider>
      <AppSidebar
        weeks={weeks}
        activeId={activeId}
        attachmentsByReport={attachmentsByReport}
        onSelect={setActiveId}
        onCreateNew={handleCreateNew}
        onGoHome={handleGoHome}
        onDelete={requestDelete}
        onExpandWeek={ensureAttachmentsLoaded}
        onOpenTrash={() => setTrashOpen(true)}
      />
      <SidebarInset className="flex h-screen flex-col overflow-hidden">
        <SiteHeader
          mode={mode}
          onModeChange={setMode}
          onJumpThisWeek={handleJumpThisWeek}
          saveStatus={saveStatus}
          onExportPdf={handleExportPdf}
          canExport={Boolean(activeReport)}
          onGoHome={handleGoHome}
          onSave={handleSave}
          onDelete={activeWeek ? () => requestDelete(activeWeek) : undefined}
          hasActive={Boolean(activeReport)}
        />
        <main className="flex-1 overflow-y-auto bg-muted/40 print:bg-white">
          {loading ? (
            <LoadingState />
          ) : activeWeek && activeReport ? (
            mode === "edit" ? (
              <ReportForm
                key={`${activeWeek.id}-edit`}
                report={activeReport}
                onChange={updateActiveReport}
                attachments={activeAttachments}
                onAttachmentsChange={updateActiveAttachments}
              />
            ) : (
              <ReportPreview
                key={`${activeWeek.id}-preview`}
                report={activeReport}
                attachments={activeAttachments}
              />
            )
          ) : (
            <Hero onStart={handleCreateNew} hasWeeks={weeks.length > 0} />
          )}
        </main>
      </SidebarInset>

      <Dialog
        open={!!deleteDialog}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[18px] text-destructive">
              보고서를 삭제하시겠습니까?
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-[1.75]">
              <strong className="text-foreground">
                {deleteDialog?.title}
              </strong>{" "}
              보고서를 삭제합니다.
              <br />
              작성된 모든 내용이 복구할 수 없게 사라집니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!duplicateDialog}
        onOpenChange={(open) => !open && setDuplicateDialog(null)}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[18px]">
              이미 같은 주차의 보고서가 있습니다
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-[1.75]">
              <strong className="text-foreground">
                {duplicateDialog?.meta.month}월{" "}
                {duplicateDialog?.meta.weekInMonth}주차
              </strong>{" "}
              보고서가 이미 존재합니다.
              <br />
              새로 추가하면{" "}
              <strong className="text-primary">
                {duplicateDialog?.meta.month}월{" "}
                {duplicateDialog?.meta.weekInMonth}주차 (
                {duplicateDialog?.nextSuffixIndex})
              </strong>
              로 생성됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleOpenExisting}>
              기존 보고서 열기
            </Button>
            <Button onClick={handleConfirmDuplicate}>새로 추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {trashOpen && (
        <TrashDialog
          open={trashOpen}
          onOpenChange={setTrashOpen}
          onRestored={async () => {
          // 휴지통에서 복원하면 메인 목록도 새로고침
          try {
            const list = await listWeeks();
            setWeeks(list);
          } catch (err) {
            console.error("[listWeeks:after-restore]", err);
          }
          if (activeId) {
            try {
              const atts = await listAttachments(activeId);
              setAttachmentsByReport((prev) => ({
                ...prev,
                [activeId]: atts,
              }));
            } catch (err) {
              console.error("[listAttachments:after-restore]", err);
            }
          }
        }}
        />
      )}
    </SidebarProvider>
  );
}

/* ─── 헬퍼: 병합 단위 경로 → 표시용 라벨 ─────────────── */
const LEAF_LABELS: Record<string, string> = {
  "meta.title": "제목",
  "meta.dateStart": "시작일",
  "meta.dateEnd": "종료일",
  "meta.reportDate": "보고일",
  discussions: "주요 논의사항",
  miscs: "기타 사항",
};

function leafLabel(path: string): string {
  const m = path.match(/^areas\.(\w+)\.(result|plans)$/);
  if (m) {
    const area = PROGRAM_AREAS.find((a) => a.key === m[1]);
    return `${area?.label ?? m[1]} ${m[2] === "result" ? "실적" : "계획"}`;
  }
  return LEAF_LABELS[path] ?? path;
}

/* ─── 헬퍼: 오늘이 속한 주차 메타 계산 ───────────────── */
function thisWeekMeta(now: Date = new Date()) {
  const day = now.getDay(); // 0=일, 1=월, ..., 6=토
  const mondayOffset = (day + 6) % 7; // 월요일까지 거슬러 갈 일수
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - mondayOffset);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    year: monday.getFullYear(),
    month: monday.getMonth() + 1,
    weekInMonth: Math.ceil(monday.getDate() / 7),
    dateStart: toISODate(monday),
    dateEnd: toISODate(friday),
  };
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sortWeeks(a: Week, b: Week): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.weekInMonth - b.weekInMonth;
}

function LoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      <p className="font-mono text-[11px]">보고서를 불러오는 중…</p>
    </div>
  );
}

function Hero({
  onStart,
  hasWeeks,
}: {
  onStart: () => void;
  hasWeeks: boolean;
}) {
  return (
    <div className="flex flex-col">
    <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch px-10 py-16">
      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-primary">
        {hasWeeks ? "주차를 선택하세요" : "새 보고서를 시작하세요"}
      </span>
      <h1 className="mt-3 font-serif text-[34px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground">
        이번 주 업무를
        <br />
        한 장의 보고서로.
      </h1>
      <p className="mt-4 max-w-[520px] text-[14px] leading-[1.75] text-muted-foreground">
        왼쪽 사이드바에서 작성할 주차를 선택하거나, 새 보고서를 만들어
        시작합니다. 모든 입력은 자동으로 저장되며, 언제든{" "}
        <span className="font-medium text-foreground">미리보기 모드</span>로
        전환해 보고서 양식으로 확인할 수 있습니다.
      </p>

      <div className="mt-7 flex items-center gap-2.5">
        <Button size="lg" onClick={onStart} className="h-11 gap-2 px-5">
          새 보고서 만들기
          <ArrowRight className="size-4" strokeWidth={2.25} />
        </Button>
      </div>

      {/* K-Brain 보안 안내 */}
      <aside className="mt-12 flex gap-3 rounded-md border border-destructive/20 bg-destructive/[0.04] p-4">
        <ShieldAlert
          className="mt-0.5 size-4 shrink-0 text-destructive"
          strokeWidth={2}
        />
        <div className="flex-1">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-destructive">
            Confidential · K-Brain Internal
          </div>
          <p className="mt-1.5 text-[12px] leading-[1.75] text-muted-foreground">
            본 자료는{" "}
            <strong className="text-foreground">㈜케이브레인컴퍼니</strong>의
            자산이며, 사업 수행을 위한 내부 작성용 문서입니다. 무단 복제·배포·외부
            유출 시{" "}
            <span className="font-medium text-foreground">
              부정경쟁방지 및 영업비밀보호에 관한 법률
            </span>{" "}
            등 관련 법령에 따라 민·형사상 책임이 따를 수 있습니다.
          </p>
        </div>
      </aside>
    </div>
    <div className="w-full px-10 pb-16">
      <AnnualRoadmap />
    </div>
    </div>
  );
}
