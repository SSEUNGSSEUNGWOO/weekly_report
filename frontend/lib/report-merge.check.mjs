// 실행: node lib/report-merge.check.mjs  (Node 24 타입 스트리핑)
import assert from "node:assert/strict";
import { mergeReport } from "./report-merge.ts";

const area = (result = "", plans = []) => ({ result, plans });
const report = (over = {}) => ({
  id: "r1",
  meta: { weekIndex: 1, title: "1주차", dateStart: "", dateEnd: "", reportDate: "", updatedAt: "t0" },
  discussions: [],
  miscs: [],
  areas: { general: area(), expert: area(), champion: area(), consulting: area(), diagnosis: area(), system: area() },
  ...over,
});

const base = report();
// 나: 챔피언 실적 수정 / 상대: 일반교육 계획 추가 + updatedAt 갱신
const local = report({ areas: { ...base.areas, champion: area("그린 6회차 OT") } });
const server = report({
  meta: { ...base.meta, updatedAt: "t1" },
  areas: { ...base.areas, general: area("", [{ id: "p1", weekday: "월", date: "9.15", task: "OT", dueDate: "" }]) },
});

const { merged, collisions } = mergeReport(base, local, server);
assert.equal(merged.areas.champion.result, "그린 6회차 OT", "내 변경 유지");
assert.equal(merged.areas.general.plans.length, 1, "상대 변경 반영");
assert.equal(merged.meta.updatedAt, "t1", "서버 메타 채택");
assert.deepEqual(collisions, []);

// 같은 항목 충돌: 내 값 유지 + collisions 기록
const local2 = report({ miscs: [{ id: "m1", type: "공유", content: "A", status: "" }] });
const server2 = report({ miscs: [{ id: "m2", type: "공유", content: "B", status: "" }] });
const r2 = mergeReport(base, local2, server2);
assert.equal(r2.merged.miscs[0].content, "A");
assert.deepEqual(r2.collisions, ["miscs"]);

// 내가 안 바꾼 항목은 서버 값
const r3 = mergeReport(base, base, server2);
assert.equal(r3.merged.miscs[0].content, "B");
assert.deepEqual(r3.collisions, []);

console.log("report-merge OK");
