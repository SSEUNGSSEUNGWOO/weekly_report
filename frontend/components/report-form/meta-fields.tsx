"use client";

import type { ReportMeta } from "@/lib/report-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  meta: ReportMeta;
  onChange: (next: ReportMeta) => void;
};

export function MetaFields({ meta, onChange }: Props) {
  const set = <K extends keyof ReportMeta>(k: K, v: ReportMeta[K]) =>
    onChange({ ...meta, [k]: v });

  return (
    <section className="rounded-lg border border-border bg-card px-6 py-5">
      <div className="mb-4">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
          보고서 정보
        </p>
        <h2 className="mt-1 font-serif text-[20px] font-semibold tracking-[-0.01em] text-foreground">
          {meta.title || `${meta.weekIndex}주차`} 주간업무보고
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="주차 제목">
          <Input
            value={meta.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={`${meta.weekIndex}주차`}
          />
        </Field>

        <Field label="기간 시작">
          <Input
            type="date"
            value={meta.dateStart}
            onChange={(e) => set("dateStart", e.target.value)}
          />
        </Field>

        <Field label="기간 종료">
          <Input
            type="date"
            value={meta.dateEnd}
            onChange={(e) => set("dateEnd", e.target.value)}
          />
        </Field>

        <Field label="보고일">
          <Input
            type="date"
            value={meta.reportDate}
            onChange={(e) => set("reportDate", e.target.value)}
          />
        </Field>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
