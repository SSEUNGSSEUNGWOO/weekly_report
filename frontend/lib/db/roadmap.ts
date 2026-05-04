import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { roadmapItems } from "@/lib/db/schema";

export type RoadmapItem = {
  id: string;
  month: number;
  category: string;
  text: string;
  done: boolean;
  sort_order: number;
};

export async function listRoadmapItems(): Promise<RoadmapItem[]> {
  const rows = await db
    .select({
      id: roadmapItems.id,
      month: roadmapItems.month,
      category: roadmapItems.category,
      text: roadmapItems.text,
      done: roadmapItems.done,
      sort_order: roadmapItems.sortOrder,
    })
    .from(roadmapItems)
    .orderBy(asc(roadmapItems.month), asc(roadmapItems.sortOrder));
  return rows;
}

export async function toggleRoadmapItem(
  id: string,
  done: boolean,
): Promise<void> {
  await db
    .update(roadmapItems)
    .set({ done, updatedAt: sql`now()` })
    .where(eq(roadmapItems.id, id));
}

export async function updateRoadmapItemText(
  id: string,
  text: string,
): Promise<void> {
  await db
    .update(roadmapItems)
    .set({ text, updatedAt: sql`now()` })
    .where(eq(roadmapItems.id, id));
}

export async function addRoadmapItem(
  month: number,
  category: string,
  text: string,
  sort_order: number,
): Promise<RoadmapItem> {
  const [row] = await db
    .insert(roadmapItems)
    .values({ month, category, text, sortOrder: sort_order })
    .returning({
      id: roadmapItems.id,
      month: roadmapItems.month,
      category: roadmapItems.category,
      text: roadmapItems.text,
      done: roadmapItems.done,
      sort_order: roadmapItems.sortOrder,
    });
  return row;
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  await db.delete(roadmapItems).where(eq(roadmapItems.id, id));
}
