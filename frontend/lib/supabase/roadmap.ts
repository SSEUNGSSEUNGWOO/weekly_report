import { createClient } from "@/lib/supabase/client";

export type RoadmapItem = {
  id: string;
  month: number;
  category: string;
  text: string;
  done: boolean;
  sort_order: number;
};

const sb = () => createClient();

export async function listRoadmapItems(): Promise<RoadmapItem[]> {
  const { data, error } = await sb()
    .from("roadmap_items")
    .select("id, month, category, text, done, sort_order")
    .order("month")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as RoadmapItem[];
}

export async function toggleRoadmapItem(id: string, done: boolean): Promise<void> {
  const { error } = await sb().from("roadmap_items").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function updateRoadmapItemText(id: string, text: string): Promise<void> {
  const { error } = await sb().from("roadmap_items").update({ text }).eq("id", id);
  if (error) throw error;
}

export async function addRoadmapItem(
  month: number,
  category: string,
  text: string,
  sort_order: number,
): Promise<RoadmapItem> {
  const { data, error } = await sb()
    .from("roadmap_items")
    .insert({ month, category, text, sort_order })
    .select("id, month, category, text, done, sort_order")
    .single();
  if (error) throw error;
  return data as RoadmapItem;
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  const { error } = await sb().from("roadmap_items").delete().eq("id", id);
  if (error) throw error;
}
