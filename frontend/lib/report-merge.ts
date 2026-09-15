import type { ProgramAreaKey, WeeklyReport } from "./report-types";

/**
 * 3자 병합: base(마지막으로 서버가 확인해 준 판) 대비 내가 바꾼 항목만 내 값,
 * 나머지는 서버 값. 양쪽이 같은 항목을 바꿨으면 내 값을 유지하고 collisions에 기록.
 * 병합 단위(leaf): meta 필드 각각, 부문별 result / plans, discussions, miscs.
 * ponytail: 배열은 통째로 비교. 행 단위 병합은 같은 표를 동시에 고치는 일이 잦아지면 추가.
 */
export type MergeResult = { merged: WeeklyReport; collisions: string[] };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function mergeReport(
  base: WeeklyReport,
  local: WeeklyReport,
  server: WeeklyReport,
): MergeResult {
  const collisions: string[] = [];
  const pick = <T>(path: string, b: T, l: T, s: T): T => {
    if (same(l, b)) return s; // 내가 안 바꿈 → 서버 값
    if (same(s, b) || same(s, l)) return l; // 나만 바꿈 → 내 값
    collisions.push(path); // 양쪽 다 바꿈 → 내 값 유지
    return l;
  };

  const areaKeys = Object.keys(local.areas) as ProgramAreaKey[];
  const empty = { result: "", plans: [] };
  const areas = Object.fromEntries(
    areaKeys.map((k) => {
      const b = base.areas[k] ?? empty;
      const l = local.areas[k] ?? empty;
      const s = server.areas[k] ?? empty;
      return [
        k,
        {
          result: pick(`areas.${k}.result`, b.result, l.result, s.result),
          plans: pick(`areas.${k}.plans`, b.plans, l.plans, s.plans),
        },
      ];
    }),
  ) as WeeklyReport["areas"];

  const merged: WeeklyReport = {
    id: local.id,
    meta: {
      ...server.meta,
      title: pick("meta.title", base.meta.title, local.meta.title, server.meta.title),
      dateStart: pick("meta.dateStart", base.meta.dateStart, local.meta.dateStart, server.meta.dateStart),
      dateEnd: pick("meta.dateEnd", base.meta.dateEnd, local.meta.dateEnd, server.meta.dateEnd),
      reportDate: pick("meta.reportDate", base.meta.reportDate, local.meta.reportDate, server.meta.reportDate),
    },
    discussions: pick("discussions", base.discussions, local.discussions, server.discussions),
    areas,
    miscs: pick("miscs", base.miscs, local.miscs, server.miscs),
  };
  return { merged, collisions };
}
