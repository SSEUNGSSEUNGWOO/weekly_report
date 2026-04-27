"use client";

import {
  type WeeklyReport,
  type ReportMeta,
  type DiscussionRow,
  type MiscRow,
  type ProgramArea,
  type ProgramAreaKey,
} from "@/lib/report-types";
import { MetaFields } from "./meta-fields";
import { SectionDiscussion } from "./section-discussion";
import { SectionProgress } from "./section-progress";
import { SectionMisc } from "./section-misc";

type Props = {
  report: WeeklyReport;
  onChange: (next: WeeklyReport) => void;
};

export function ReportForm({ report, onChange }: Props) {
  const setMeta = (meta: ReportMeta) => onChange({ ...report, meta });
  const setDiscussions = (discussions: DiscussionRow[]) =>
    onChange({ ...report, discussions });
  const setAreas = (areas: Record<ProgramAreaKey, ProgramArea>) =>
    onChange({ ...report, areas });
  const setMiscs = (miscs: MiscRow[]) => onChange({ ...report, miscs });

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-8 py-8"
    >
      <MetaFields meta={report.meta} onChange={setMeta} />
      <SectionDiscussion rows={report.discussions} onChange={setDiscussions} />
      <SectionProgress areas={report.areas} onChange={setAreas} />
      <SectionMisc rows={report.miscs} onChange={setMiscs} />
    </form>
  );
}
