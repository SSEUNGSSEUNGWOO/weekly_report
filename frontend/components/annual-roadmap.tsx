"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import {
  type RoadmapItem,
  listRoadmapItems,
  toggleRoadmapItem,
  updateRoadmapItemText,
  addRoadmapItem,
  deleteRoadmapItem,
} from "@/lib/db/roadmap";

const MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
type Month = (typeof MONTHS)[number];

const CATEGORIES = [
  "운영업무",
  "전문인재",
  "AI 챔피언",
  "역량 인증 CBT",
  "일반교육(공공AI)",
  "특화교육",
  "컨설팅",
  "역량진단",
] as const;
type Category = (typeof CATEGORIES)[number];

type LocalItem = RoadmapItem & { _pending?: boolean };

export function AnnualRoadmap() {
  const [items, setItems] = useState<LocalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRoadmapItems()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const cellItems = useCallback(
    (month: Month, category: Category) =>
      items
        .filter((i) => i.month === month && i.category === category)
        .sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );

  const handleToggle = async (item: LocalItem) => {
    if (item._pending) return;
    const done = !item.done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done } : i)));
    try {
      await toggleRoadmapItem(item.id, done);
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !done } : i)));
    }
  };

  const startEdit = (item: LocalItem) => {
    setEditingId(item.id);
    setEditText(item._pending ? "" : item.text);
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const item = items.find((i) => i.id === editingId);
    if (!item) {
      setEditingId(null);
      return;
    }
    const text = editText.trim();
    setEditingId(null);

    if (!text) {
      setItems((prev) => prev.filter((i) => i.id !== editingId));
      if (!item._pending) deleteRoadmapItem(editingId).catch(console.error);
      return;
    }

    if (item._pending) {
      try {
        const created = await addRoadmapItem(item.month, item.category, text, item.sort_order);
        setItems((prev) => prev.map((i) => (i.id === editingId ? created : i)));
      } catch {
        setItems((prev) => prev.filter((i) => i.id !== editingId));
      }
    } else {
      setItems((prev) => prev.map((i) => (i.id === editingId ? { ...i, text } : i)));
      updateRoadmapItemText(editingId, text).catch(console.error);
    }
  };

  const cancelEdit = () => {
    if (!editingId) return;
    const item = items.find((i) => i.id === editingId);
    if (item?._pending) setItems((prev) => prev.filter((i) => i.id !== editingId));
    setEditingId(null);
  };

  const handleAdd = (month: Month, category: Category) => {
    const existing = cellItems(month, category);
    const sort_order =
      existing.length > 0 ? Math.max(...existing.map((i) => i.sort_order)) + 1 : 1;
    const tempId = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      { id: tempId, month, category, text: "", done: false, sort_order, _pending: true },
    ]);
    setEditingId(tempId);
    setEditText("");
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    deleteRoadmapItem(id).catch(console.error);
  };

  if (loading) return null;

  return (
    <section className="mt-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-4 flex items-center gap-2 hover:opacity-70 transition-opacity"
      >
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <h2 className="font-serif text-[18px] font-semibold text-foreground">
          2026 연간 업무 로드맵
        </h2>
      </button>

      {open && <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-[11.5px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-[52px] min-w-[52px] border-b border-border bg-[#003478] px-3 py-2.5 text-center font-semibold whitespace-nowrap text-white">
                월
              </th>
              {CATEGORIES.map((cat) => (
                <th
                  key={cat}
                  className="min-w-[148px] border-b border-l border-border bg-[#003478] px-3 py-2.5 text-center font-semibold whitespace-nowrap text-white"
                >
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((month, mi) => (
              <tr key={month}>
                <td
                  className={`sticky left-0 z-10 border-b border-r border-border px-3 py-3 text-center align-top font-bold text-[#003478] whitespace-nowrap ${
                    mi % 2 === 0 ? "bg-[#f0f4fa]" : "bg-[#e8eef7]"
                  }`}
                >
                  {month}월
                </td>
                {CATEGORIES.map((cat) => {
                  const cItems = cellItems(month, cat);
                  return (
                    <td
                      key={cat}
                      className={`group/cell border-b border-l border-border px-3 py-3 align-top ${
                        mi % 2 === 0 ? "bg-white" : "bg-[#fafbfd]"
                      }`}
                    >
                      <ul className="space-y-1.5">
                        {cItems.map((item) => (
                          <li key={item.id} className="group/item flex items-start gap-1.5">
                            {/* 체크박스 */}
                            <button
                              type="button"
                              onClick={() => handleToggle(item)}
                              className={`mt-[2px] flex size-3.5 flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                                item.done
                                  ? "border-[#003478] bg-[#003478]"
                                  : "border-border hover:border-[#003478]/50"
                              }`}
                            >
                              {item.done && (
                                <Check className="size-2.5 text-white" strokeWidth={3} />
                              )}
                            </button>

                            {/* 텍스트 / 인라인 편집 */}
                            {editingId === item.id ? (
                              <input
                                ref={inputRef}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    commitEdit();
                                  }
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                className="min-w-0 flex-1 rounded border border-[#003478]/30 bg-[#003478]/[0.04] px-1 py-px text-[11.5px] leading-[1.6] text-foreground outline-none focus:border-[#003478]"
                              />
                            ) : (
                              <span
                                onClick={() => startEdit(item)}
                                className={`flex-1 cursor-text leading-[1.6] ${
                                  item.done
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {item.text}
                              </span>
                            )}

                            {/* 삭제 버튼 (호버 시 표시) */}
                            {editingId !== item.id && (
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="mt-[2px] flex-shrink-0 opacity-0 transition-opacity group-hover/item:opacity-100 text-muted-foreground hover:text-destructive"
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>

                      {/* 항목 추가 버튼 */}
                      <button
                        type="button"
                        onClick={() => handleAdd(month, cat)}
                        className="mt-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/cell:opacity-100 text-muted-foreground hover:text-[#003478]"
                      >
                        <Plus className="size-3" />
                        <span className="text-[10px]">추가</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  );
}
