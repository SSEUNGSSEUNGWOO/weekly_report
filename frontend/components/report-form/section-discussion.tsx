"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type DiscussionRow, newRowId } from "@/lib/report-types";
import { SectionShell } from "./section-shell";

type Props = {
  rows: DiscussionRow[];
  onChange: (next: DiscussionRow[]) => void;
};

export function SectionDiscussion({ rows, onChange }: Props) {
  const addRow = () =>
    onChange([
      ...rows,
      { id: newRowId(), category: "", content: "", decision: "" },
    ]);

  const updateRow = (id: string, patch: Partial<DiscussionRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    onChange(rows.filter((r) => r.id !== id));

  return (
    <SectionShell index="01" title="주간 주요 논의사항">
      {rows.length === 0 ? (
        <EmptyHint onAdd={addRow} />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-3 px-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <div className="col-span-2">부문</div>
            <div className="col-span-5">논의 내용</div>
            <div className="col-span-4">의사결정 / 협의 필요</div>
            <div className="col-span-1" />
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-12 gap-3 rounded-md border border-border bg-background p-3"
            >
              <Input
                className="col-span-2"
                placeholder="예: 교육"
                value={row.category}
                onChange={(e) => updateRow(row.id, { category: e.target.value })}
              />
              <Textarea
                className="col-span-5 min-h-[64px] resize-y"
                placeholder="논의 내용을 입력하세요"
                value={row.content}
                onChange={(e) => updateRow(row.id, { content: e.target.value })}
              />
              <Textarea
                className="col-span-4 min-h-[64px] resize-y"
                placeholder="결정/요청 사항"
                value={row.decision}
                onChange={(e) =>
                  updateRow(row.id, { decision: e.target.value })
                }
              />
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
            <Plus className="size-3.5" strokeWidth={2.5} />
            행 추가
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
        이번 주 회의·협의에서 논의된 사항을 항목별로 정리합니다.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
        <Plus className="size-3.5" strokeWidth={2.5} />첫 항목 추가
      </Button>
    </div>
  );
}
