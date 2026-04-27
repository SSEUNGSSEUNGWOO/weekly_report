"use client";

import { Plus, Trash2, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROGRAM_AREAS,
  type ProgramArea,
  type ProgramAreaKey,
  type PlanRow,
  type WeekDay,
  newRowId,
} from "@/lib/report-types";
import { SectionShell } from "./section-shell";

type Props = {
  areas: Record<ProgramAreaKey, ProgramArea>;
  onChange: (next: Record<ProgramAreaKey, ProgramArea>) => void;
};

const WEEKDAYS: WeekDay[] = ["월", "화", "수", "목", "금", "토", "일"];

export function SectionProgress({ areas, onChange }: Props) {
  const updateArea = (key: ProgramAreaKey, patch: Partial<ProgramArea>) =>
    onChange({ ...areas, [key]: { ...areas[key], ...patch } });

  return (
    <SectionShell
      index="02"
      title="지난주 결과 및 금주 계획"
      subtitle="6개 부문"
    >
      <div className="space-y-4">
        {PROGRAM_AREAS.map((area) => (
          <AreaCard
            key={area.key}
            index={area.index}
            label={area.label}
            value={areas[area.key]}
            onChange={(next) => updateArea(area.key, next)}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function AreaCard({
  index,
  label,
  value,
  onChange,
}: {
  index: string;
  label: string;
  value: ProgramArea;
  onChange: (patch: Partial<ProgramArea>) => void;
}) {
  const setPlans = (plans: PlanRow[]) => onChange({ plans });

  const addPlan = () =>
    setPlans([
      ...value.plans,
      { id: newRowId(), weekday: "", date: "", task: "", dueDate: "" },
    ]);

  const addWeekdays = () => {
    const existing = new Set(value.plans.map((p) => p.weekday));
    const additions: PlanRow[] = (["월", "화", "수", "목", "금"] as WeekDay[])
      .filter((d) => !existing.has(d))
      .map((d) => ({
        id: newRowId(),
        weekday: d,
        date: "",
        task: "",
        dueDate: "",
      }));
    setPlans([...value.plans, ...additions]);
  };

  const updatePlan = (id: string, patch: Partial<PlanRow>) =>
    setPlans(value.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const removePlan = (id: string) =>
    setPlans(value.plans.filter((p) => p.id !== id));

  return (
    <article className="overflow-hidden rounded-md border border-border bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-primary/[0.05] px-4 py-3">
        <span className="text-[15px] font-bold text-primary">
          {index}
        </span>
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
          {label}
        </h3>
      </header>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        {/* 좌측: 지난주 추진 실적 */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            지난주 추진 실적
          </span>
          <Textarea
            className="min-h-[120px] resize-y"
            placeholder="이번 주에 마무리한 일을 항목별로 정리하세요"
            value={value.result}
            onChange={(e) => onChange({ result: e.target.value })}
          />
        </div>

        {/* 우측: 금주 추진 계획 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              금주 추진 계획
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] font-medium text-muted-foreground hover:text-primary"
                onClick={addWeekdays}
              >
                <CalendarPlus className="size-3.5" strokeWidth={2} />
                월–금 추가
              </Button>
            </div>
          </div>

          {value.plans.length === 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPlan}
              className="h-9 gap-1.5"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />첫 계획 추가
            </Button>
          ) : (
            <div className="flex flex-col gap-1.5">
              {value.plans.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 items-center gap-1.5"
                >
                  <Select
                    value={p.weekday}
                    onValueChange={(v) =>
                      updatePlan(p.id, { weekday: v as WeekDay })
                    }
                  >
                    <SelectTrigger className="col-span-2 h-9 text-[12px]">
                      <SelectValue placeholder="요일" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="col-span-2 h-9 text-[12px]"
                    placeholder="1.27"
                    value={p.date}
                    onChange={(e) =>
                      updatePlan(p.id, { date: e.target.value })
                    }
                  />
                  <Input
                    className="col-span-5 h-9 text-[12px]"
                    placeholder="과업 내용"
                    value={p.task}
                    onChange={(e) =>
                      updatePlan(p.id, { task: e.target.value })
                    }
                  />
                  <Input
                    type="date"
                    className="col-span-2 h-9 text-[11px]"
                    value={p.dueDate}
                    onChange={(e) =>
                      updatePlan(p.id, { dueDate: e.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="col-span-1 size-9 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removePlan(p.id)}
                    aria-label="계획 삭제"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addPlan}
                className="mt-1 h-8 w-fit gap-1 px-2 text-[11px] text-muted-foreground hover:text-primary"
              >
                <Plus className="size-3.5" strokeWidth={2.5} />행 추가
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
