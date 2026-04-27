/**
 * 행정안전부 AI·데이터기반행정 역량강화 사업 주간업무보고 데이터 모델
 */

export type ReportMeta = {
  weekIndex: number;          // 1, 2, 3...
  title: string;              // "1주차"
  dateStart: string;          // ISO 날짜 YYYY-MM-DD
  dateEnd: string;
  reportDate: string;
  createdAt?: string;
  updatedAt?: string;
};

/* ─── 섹션 01: 주간 주요 논의사항 ─────────────────────── */
export type DiscussionRow = {
  id: string;
  category: string;
  content: string;
  decision: string;
};

/* ─── 섹션 02: 6개 부문 실적/계획 ──────────────────────── */
export const PROGRAM_AREAS = [
  { key: "general", index: "①", label: "일반교육" },
  { key: "expert", index: "②", label: "전문인재 양성" },
  { key: "champion", index: "③", label: "AI 챔피언" },
  { key: "consulting", index: "④", label: "컨설팅" },
  { key: "diagnosis", index: "⑤", label: "역량진단" },
  { key: "system", index: "⑥", label: "시스템·기타" },
] as const;

export type ProgramAreaKey = (typeof PROGRAM_AREAS)[number]["key"];

export type WeekDay = "월" | "화" | "수" | "목" | "금" | "토" | "일";

export type PlanRow = {
  id: string;
  weekday: WeekDay | "";
  date: string;          // 자유 텍스트 (예: "1.27")
  task: string;
  dueDate: string;       // 완료 예정일 (월/일, 예: "4.30")
  doneDate: string;      // 실제 완료 일자 (월/일, 예: "4.29")
};

export type ProgramArea = {
  result: string;        // 지난주 추진 실적
  plans: PlanRow[];      // 금주 추진 계획
};

/* ─── 섹션 03: 기타 사항 ──────────────────────────────── */
export const MISC_TYPES = [
  "위험",
  "주관기관 요청",
  "사업단 요청",
  "공유",
  "기타",
] as const;

export const MISC_STATUSES = [
  "진행중",
  "완료",
  "검토중",
  "보류",
  "지연",
] as const;

export type MiscType = (typeof MISC_TYPES)[number];
export type MiscStatus = (typeof MISC_STATUSES)[number];

export type MiscRow = {
  id: string;
  type: MiscType | "";
  content: string;
  status: MiscStatus | "";
};

/* ─── 보고서 전체 ─────────────────────────────────────── */
export type WeeklyReport = {
  id: string;
  meta: ReportMeta;
  discussions: DiscussionRow[];
  areas: Record<ProgramAreaKey, ProgramArea>;
  miscs: MiscRow[];
};

/* ─── 빈 보고서 생성 헬퍼 ─────────────────────────────── */
export function createEmptyReport(weekIndex: number): WeeklyReport {
  const newId = () => crypto.randomUUID();
  const emptyArea = (): ProgramArea => ({ result: "", plans: [] });

  return {
    id: newId(),
    meta: {
      weekIndex,
      title: `${weekIndex}주차`,
      dateStart: "",
      dateEnd: "",
      reportDate: "",
    },
    discussions: [],
    areas: {
      general: emptyArea(),
      expert: emptyArea(),
      champion: emptyArea(),
      consulting: emptyArea(),
      diagnosis: emptyArea(),
      system: emptyArea(),
    },
    miscs: [],
  };
}

export function newRowId(): string {
  return crypto.randomUUID();
}
