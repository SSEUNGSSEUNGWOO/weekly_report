import {
  type WeeklyReport,
  type ReportAttachment,
  PROGRAM_AREAS,
} from "@/lib/report-types";

type Props = {
  report: WeeklyReport;
  attachments?: ReportAttachment[];
};

const DASH = "—";

export function ReportPreview({ report, attachments = [] }: Props) {
  const { meta, discussions, areas, miscs } = report;
  const minutesAtts = attachments.filter((a) => a.kind === "minutes");
  const fileAtts = attachments.filter((a) => a.kind === "file");

  return (
    <div className="mx-auto my-10 w-full max-w-[210mm] bg-white px-12 py-14 font-serif text-[12.5px] leading-[1.7] text-foreground shadow-[0_4px_24px_rgba(15,23,42,0.08)] ring-1 ring-border print:my-0 print:shadow-none print:ring-0">
      {/* 표지 */}
      <header className="border-b-2 border-foreground pb-6 text-center">
        <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.24em] text-primary">
          행정안전부 · Weekly Status Report
        </div>
        <h1 className="mt-3 text-[28px] font-bold tracking-[-0.01em]">
          {meta.title || `${meta.weekIndex}주차`} 주간업무보고
        </h1>
        <p className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">
          AI·데이터기반행정 역량강화 사업
        </p>
      </header>

      {/* 메타 */}
      <dl className="mt-7 grid grid-cols-3 gap-0 border border-foreground text-[12px]">
        <MetaCell label="기 간" value={`${meta.dateStart || DASH} ~ ${meta.dateEnd || DASH}`} />
        <MetaCell label="보고일" value={meta.reportDate || DASH} />
        <MetaCell label="작성자" value={DASH} last />
      </dl>

      {/* 섹션 01 */}
      <Section number="01" title="주간 주요 논의사항">
        {discussions.length === 0 ? (
          <EmptyText>등록된 논의 항목이 없습니다.</EmptyText>
        ) : (
          <DocTable
            headers={["부문", "논의 내용", "의사결정 / 협의 필요"]}
            colWidths={["18%", "44%", "38%"]}
            rows={discussions.map((d) => [d.category || DASH, d.content || DASH, d.decision || DASH])}
          />
        )}
      </Section>

      {/* 섹션 02 */}
      <Section number="02" title="지난주 추진 결과 및 금주 추진 계획">
        <div className="space-y-5">
          {PROGRAM_AREAS.map((a) => {
            const area = areas[a.key];
            return (
              <article key={a.key} className="border border-foreground">
                <div className="flex items-center gap-2 border-b border-foreground bg-primary/10 px-3 py-2">
                  <span className="text-[14px] font-bold text-primary">
                    {a.index}
                  </span>
                  <h3 className="text-[13px] font-bold tracking-[-0.005em]">
                    {a.label}
                  </h3>
                </div>

                <div className="grid grid-cols-2 divide-x divide-foreground">
                  <div className="px-3 py-3">
                    <div className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      가. 지난주 추진 실적
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-[1.75]">
                      {area.result || DASH}
                    </p>
                  </div>

                  <div className="flex flex-col">
                    <div className="px-3 pt-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      나. 금주 추진 계획
                    </div>
                    <div className="px-3 pb-3 pt-1.5">
                      {area.plans.length === 0 ? (
                        <p className="text-[12px] text-muted-foreground">{DASH}</p>
                      ) : (
                        <DocTable
                          headers={["요일", "날짜", "과업 내용", "완료 예정일"]}
                          colWidths={["14%", "16%", "48%", "22%"]}
                          centerColumns={[0, 1, 3]}
                          rows={area.plans.map((p) => [
                            p.weekday || DASH,
                            p.date || DASH,
                            p.task || DASH,
                            p.dueDate || DASH,
                          ])}
                          dense
                        />
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      {/* 섹션 03 */}
      <Section number="03" title="기타 사항">
        {miscs.length === 0 ? (
          <EmptyText>특별히 보고할 기타 사항이 없습니다.</EmptyText>
        ) : (
          <DocTable
            headers={["구분", "내용", "상태"]}
            colWidths={["18%", "62%", "20%"]}
            centerColumns={[0, 2]}
            rows={miscs.map((m) => [m.type || DASH, m.content || DASH, m.status || DASH])}
          />
        )}
      </Section>

      {/* 섹션 04 — 첨부가 있을 때만 노출 */}
      {fileAtts.length > 0 && (
        <Section number="04" title="파일 첨부">
          <AttachmentList items={fileAtts} />
        </Section>
      )}

      {/* 섹션 05 — 첨부가 있을 때만 노출 */}
      {minutesAtts.length > 0 && (
        <Section number="05" title="회의록 첨부">
          <AttachmentList items={minutesAtts} />
        </Section>
      )}

      {/* 푸터 */}
      <footer className="mt-12 border-t border-foreground pt-3 text-center font-mono text-[10px] text-muted-foreground">
        — 본 문서는 행정안전부 · 한국지능정보사회진흥원 AI·데이터기반행정 역량강화 사업 주간업무보고 양식입니다 —
      </footer>
    </div>
  );
}

function MetaCell({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-stretch ${last ? "" : "border-r border-foreground"}`}>
      <dt className="flex w-[68px] shrink-0 items-center justify-center bg-muted px-2 py-2 text-[11px] font-bold tracking-[0.05em]">
        {label}
      </dt>
      <dd className="flex flex-1 items-center px-3 py-2 text-[12px]">
        {value}
      </dd>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-baseline gap-2 border-b-2 border-foreground pb-1.5">
        <span className="font-mono text-[12px] font-bold text-primary">{number}.</span>
        <span className="text-[16px] font-bold tracking-[-0.01em]">{title}</span>
      </h2>
      {children}
    </section>
  );
}

function AttachmentList({ items }: { items: ReportAttachment[] }) {
  return (
    <ul className="border border-foreground">
      {items.map((a, idx) => (
        <li
          key={a.id}
          className={
            idx === items.length - 1 ? "" : "border-b border-foreground"
          }
        >
          <a
            href={`${a.blobUrl}?download=${encodeURIComponent(a.filename)}`}
            download={a.filename}
            className="flex items-center gap-3 px-3 py-2 text-[12px] text-foreground no-underline transition-colors hover:bg-muted/60 hover:underline focus-visible:bg-muted/60 focus-visible:outline-none"
          >
            <span className="shrink-0 font-bold tabular-nums">
              첨부{idx + 1}.
            </span>
            <span className="truncate">{a.filename}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-muted-foreground bg-muted/40 px-4 py-6 text-center text-[12px] text-muted-foreground">
      {children}
    </p>
  );
}

function DocTable({
  headers,
  rows,
  colWidths,
  dense = false,
  centerColumns = [0],
}: {
  headers: string[];
  rows: (string | number)[][];
  colWidths?: string[];
  dense?: boolean;
  centerColumns?: number[];
}) {
  const cellPad = dense ? "px-1.5 py-1.5" : "px-3 py-2.5";
  return (
    <table className="w-full table-fixed border-collapse border border-foreground text-[12px]">
      {colWidths && (
        <colgroup>
          {colWidths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
      )}
      <thead>
        <tr>
          {headers.map((h) => (
            <th
              key={h}
              style={{ textAlign: "center" }}
              className={`break-keep border border-foreground bg-muted font-bold tracking-[-0.005em] ${cellPad}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => {
              const isCentered = centerColumns.includes(ci);
              return (
                <td
                  key={ci}
                  style={isCentered ? { textAlign: "center" } : undefined}
                  className={`border border-foreground align-top ${cellPad} ${
                    ci === 0 ? "font-medium" : ""
                  }`}
                >
                  <span className="whitespace-pre-wrap break-keep">{cell}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
