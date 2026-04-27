"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MISC_TYPES,
  MISC_STATUSES,
  type MiscRow,
  type MiscType,
  type MiscStatus,
  newRowId,
} from "@/lib/report-types";
import { SectionShell } from "./section-shell";

type Props = {
  rows: MiscRow[];
  onChange: (next: MiscRow[]) => void;
};

const STATUS_TONE: Record<MiscStatus, string> = {
  진행중: "bg-blue-50 text-primary ring-blue-100",
  완료: "bg-green-50 text-success ring-green-100",
  검토중: "bg-amber-50 text-amber-700 ring-amber-100",
  보류: "bg-slate-100 text-muted-foreground ring-slate-200",
  지연: "bg-red-50 text-destructive ring-red-100",
};

export function SectionMisc({ rows, onChange }: Props) {
  const addRow = () =>
    onChange([
      ...rows,
      { id: newRowId(), type: "", content: "", status: "" },
    ]);

  const updateRow = (id: string, patch: Partial<MiscRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    onChange(rows.filter((r) => r.id !== id));

  return (
    <SectionShell index="03" title="기타 사항">
      {rows.length === 0 ? (
        <EmptyHint onAdd={addRow} />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-3 px-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <div className="col-span-2">구분</div>
            <div className="col-span-7">내용</div>
            <div className="col-span-2">상태</div>
            <div className="col-span-1" />
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-12 items-start gap-3 rounded-md border border-border bg-background p-3"
            >
              <Select
                value={row.type}
                onValueChange={(v) =>
                  updateRow(row.id, { type: v as MiscType })
                }
              >
                <SelectTrigger className="col-span-2">
                  <SelectValue placeholder="구분" />
                </SelectTrigger>
                <SelectContent>
                  {MISC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                className="col-span-7 min-h-[64px] resize-y"
                placeholder="내용을 입력하세요"
                value={row.content}
                onChange={(e) => updateRow(row.id, { content: e.target.value })}
              />

              <div className="col-span-2 flex flex-col gap-1.5">
                <Select
                  value={row.status}
                  onValueChange={(v) =>
                    updateRow(row.id, { status: v as MiscStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    {MISC_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {row.status && (
                  <span
                    className={`inline-flex justify-center rounded px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset ${
                      STATUS_TONE[row.status as MiscStatus]
                    }`}
                  >
                    {row.status}
                  </span>
                )}
              </div>

              <div className="col-span-1 flex items-start justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(row.id)}
                  aria-label="행 삭제"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            className="gap-1.5"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />행 추가
          </Button>
        </div>
      )}
    </SectionShell>
  );
}

function EmptyHint({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <p className="text-[13px] text-muted-foreground">
        위험·요청·공유 등 별도로 보고할 사항이 있다면 추가하세요.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
        <Plus className="size-3.5" strokeWidth={2.5} />첫 항목 추가
      </Button>
    </div>
  );
}
