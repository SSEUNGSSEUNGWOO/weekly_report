"use client";

import { useState } from "react";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export type Week = {
  id: string;
  year: number;
  month: number;
  weekInMonth: number;
  weekIndex: number;
  title: string;
  range: string;
  status: "draft" | "submitted" | "empty";
};

type Props = {
  weeks: Week[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreateNew?: () => void;
  onGoHome?: () => void;
  onDelete?: (week: Week) => void;
};

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

export function AppSidebar({ weeks, activeId, onSelect, onCreateNew, onGoHome, onDelete }: Props) {
  const grouped = groupByMonth(weeks);
  const activeWeek = weeks.find((w) => w.id === activeId);

  const initialOpen = new Set<number>();
  if (activeWeek) initialOpen.add(activeWeek.month);
  else if (weeks.length > 0) initialOpen.add(weeks[weeks.length - 1].month);

  const [openMonths, setOpenMonths] = useState<Set<number>>(initialOpen);

  const toggleMonth = (month: number) =>
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });

  return (
    <Sidebar className="print:hidden">
      {/* 정부 톤 강조 띠 */}
      <div className="h-1 w-full shrink-0 bg-primary" aria-hidden />

      <SidebarHeader className="border-b border-sidebar-border px-5 pb-4 pt-4">
        <button
          type="button"
          onClick={onGoHome}
          title="홈으로 이동"
          className="-mx-2 flex flex-col items-start rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent"
        >
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            행정안전부 · 주간업무보고
          </span>
          <span className="mt-1 font-serif text-[16px] font-bold leading-tight tracking-[-0.01em] text-sidebar-foreground">
            AI·데이터기반행정 역량강화
          </span>
        </button>

        <div className="mt-3 flex items-center gap-3 font-mono text-[10.5px]">
          <span className="font-semibold text-primary">2026</span>
          <span className="size-1 rounded-full bg-sidebar-border" aria-hidden />
          <span className="text-muted-foreground">
            전체{" "}
            <span className="font-semibold text-sidebar-foreground">
              {weeks.length}
            </span>
            주차
          </span>
        </div>

        {/* 총괄 책임 */}
        <div className="mt-3 rounded-md bg-sidebar-accent/40 px-3 py-2">
          <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            총괄
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[13px] font-bold tracking-[-0.01em] text-sidebar-foreground">
              이재우 상무
            </span>
            <span className="text-[10.5px] text-muted-foreground">
              ㈜케이브레인컴퍼니
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {Object.keys(grouped)
          .map(Number)
          .sort((a, b) => a - b)
          .map((month) => {
            const monthWeeks = grouped[month];
            const isOpen = openMonths.has(month);

            return (
              <div key={month} className="mb-1.5">
                <button
                  type="button"
                  onClick={() => toggleMonth(month)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent"
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight
                      className={`size-3.5 text-muted-foreground transition-transform ${
                        isOpen ? "rotate-90" : ""
                      }`}
                      strokeWidth={2.5}
                    />
                    <span className="font-serif text-[15px] font-bold tracking-[-0.01em] text-sidebar-foreground">
                      {MONTH_LABELS[month - 1]}
                    </span>
                  </span>
                  <span className="font-mono text-[10.5px] font-medium text-muted-foreground tabular-nums">
                    {monthWeeks.length}주
                  </span>
                </button>

                {isOpen && (
                  <ul className="mt-0.5 flex flex-col gap-0.5 pl-1">
                    {monthWeeks.map((w) => (
                      <WeekRow
                        key={w.id}
                        week={w}
                        active={activeId === w.id}
                        onClick={() => onSelect(w.id)}
                        onDelete={onDelete ? () => onDelete(w) : undefined}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          type="button"
          onClick={onCreateNew}
          size="lg"
          className="h-11 w-full gap-2 text-[13.5px] font-semibold tracking-[-0.01em]"
        >
          <Plus className="size-4" strokeWidth={2.5} />새 보고서 추가
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function WeekRow({
  week,
  active,
  onClick,
  onDelete,
}: {
  week: Week;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <li className="group/row relative">
      <button
        type="button"
        onClick={onClick}
        className={`relative flex w-full items-center justify-between gap-3 rounded-md py-2 pr-3 pl-4 text-left transition-all ${
          active
            ? "bg-card shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
            : "hover:bg-sidebar-accent/60"
        }`}
      >
        {/* 활성 좌측 강조선 */}
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r bg-primary"
          />
        )}

        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className={`size-1.5 shrink-0 rounded-full transition-colors ${
              active ? "bg-primary" : "bg-sidebar-border"
            }`}
          />
          <span
            className={`text-[13.5px] tracking-[-0.01em] ${
              active
                ? "font-bold text-foreground"
                : "font-semibold text-sidebar-foreground/90"
            }`}
          >
            {week.title || `${week.weekInMonth}주차`}
          </span>
        </span>

        <span
          className={`font-mono text-[10.5px] tabular-nums transition-opacity ${
            active ? "text-foreground/70" : "text-muted-foreground/70"
          } ${onDelete ? "group-hover/row:opacity-0" : ""}`}
        >
          {week.range}
        </span>
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="보고서 삭제"
          title="삭제"
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/row:opacity-100"
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} />
        </button>
      )}
    </li>
  );
}

function StatusDot({ status }: { status: Week["status"] }) {
  const cls =
    status === "submitted"
      ? "bg-success"
      : status === "draft"
        ? "bg-amber-500"
        : "bg-sidebar-border opacity-60";
  return <span className={`size-1.5 shrink-0 rounded-full ${cls}`} />;
}

function groupByMonth(weeks: Week[]): Record<number, Week[]> {
  const out: Record<number, Week[]> = {};
  for (const w of weeks) {
    if (!out[w.month]) out[w.month] = [];
    out[w.month].push(w);
  }
  for (const m in out) {
    out[m].sort((a, b) => a.weekInMonth - b.weekInMonth);
  }
  return out;
}
