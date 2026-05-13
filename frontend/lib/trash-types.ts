/**
 * 휴지통 관련 상수·타입 (클라이언트에서 import 가능)
 * "use server" 파일에서는 함수만 export 가능하므로 분리.
 */
import type { AttachmentKind } from "./report-types";

export const TRASH_RETENTION_DAYS = 30;

export type TrashedReport = {
  kind: "report";
  id: string;
  title: string;
  range: string;
  year: number | null;
  month: number | null;
  weekInMonth: number | null;
  deletedAt: string;
};

export type TrashedAttachment = {
  kind: "attachment";
  id: string;
  reportId: string;
  reportTitle: string | null;
  attachmentKind: AttachmentKind;
  filename: string;
  size: number;
  deletedAt: string;
};

export type TrashItem = TrashedReport | TrashedAttachment;
