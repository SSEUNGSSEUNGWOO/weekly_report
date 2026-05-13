import {
  pgTable,
  uuid,
  integer,
  bigint,
  text,
  date,
  jsonb,
  timestamp,
  boolean,
  check,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    year: integer("year"),
    month: integer("month"),
    weekInMonth: integer("week_in_month"),
    weekIndex: integer("week_index"),
    title: text("title"),
    dateStart: date("date_start"),
    dateEnd: date("date_end"),
    reportDate: date("report_date"),
    discussions: jsonb("discussions").default([]),
    areas: jsonb("areas").default({}),
    miscs: jsonb("miscs").default([]),
    status: text("status").default("empty"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("reports_week_index_key").on(t.weekIndex),
    index("reports_week_index_idx").on(t.weekIndex),
    index("reports_year_month_idx").on(t.year, t.month),
    index("reports_deleted_at_idx").on(t.deletedAt),
  ],
);

export const reportAttachments = pgTable(
  "report_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),                 // 'minutes' | 'file'
    filename: text("filename").notNull(),
    contentType: text("content_type").default("").notNull(),
    size: bigint("size", { mode: "number" }).default(0).notNull(),
    blobUrl: text("blob_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "report_attachments_kind_check",
      sql`${t.kind} IN ('minutes','file')`,
    ),
    index("report_attachments_report_kind_idx").on(t.reportId, t.kind, t.sortOrder),
    index("report_attachments_deleted_at_idx").on(t.deletedAt),
  ],
);

export const roadmapItems = pgTable(
  "roadmap_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    month: integer("month").notNull(),
    category: text("category").notNull(),
    text: text("text").default("").notNull(),
    done: boolean("done").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "roadmap_items_month_check",
      sql`${t.month} >= 1 AND ${t.month} <= 12`,
    ),
    index("roadmap_items_month_cat_idx").on(t.month, t.category),
  ],
);
