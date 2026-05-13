"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

const KOREAN_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

type Props = {
  onClick?: () => void;
  active?: boolean;
};

export function TodayClock({ onClick, active = false }: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  const content = (
    <>
      <Calendar
        className={`size-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
        strokeWidth={2}
      />
      <div className="flex flex-col items-start leading-tight">
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          오늘 · 이번 주
        </span>
        {now ? (
          <span className="font-mono text-[12px] font-semibold tabular-nums text-foreground">
            {format(now)}
          </span>
        ) : (
          <span className="font-mono text-[12px] font-semibold tabular-nums text-muted-foreground">
            ──.──.── (─) ──:──
          </span>
        )}
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 md:flex">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="이번 주 보고서로 이동"
      className={`hidden items-center gap-2 rounded-md border px-3 py-1.5 text-left transition-colors md:flex ${
        active
          ? "border-primary/30 bg-accent"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent"
      }`}
    >
      {content}
    </button>
  );
}

function format(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const w = KOREAN_DAYS[d.getDay()];
  return `${y}.${m}.${day} (${w}) ${hh}:${mm}`;
}
