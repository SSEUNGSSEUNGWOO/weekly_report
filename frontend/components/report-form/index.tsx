"use client";

import {
  type WeeklyReport,
  type ReportMeta,
  type DiscussionRow,
  type MiscRow,
  type ProgramArea,
  type ProgramAreaKey,
  type ReportAttachment,
} from "@/lib/report-types";
import { MetaFields } from "./meta-fields";
import { SectionDiscussion } from "./section-discussion";
import { SectionProgress } from "./section-progress";
import { SectionMisc } from "./section-misc";
import { SectionAttachments } from "./section-attachments";

type Props = {
  report: WeeklyReport;
  onChange: (next: WeeklyReport) => void;
  attachments: ReportAttachment[];
  onAttachmentsChange: (next: ReportAttachment[]) => void;
};

export function ReportForm({
  report,
  onChange,
  attachments,
  onAttachmentsChange,
}: Props) {
  const setMeta = (meta: ReportMeta) => onChange({ ...report, meta });
  const setDiscussions = (discussions: DiscussionRow[]) =>
    onChange({ ...report, discussions });
  const setAreas = (areas: Record<ProgramAreaKey, ProgramArea>) =>
    onChange({ ...report, areas });
  const setMiscs = (miscs: MiscRow[]) => onChange({ ...report, miscs });

  const minutes = attachments.filter((a) => a.kind === "minutes");
  const files = attachments.filter((a) => a.kind === "file");

  const onMinutesChange = (next: ReportAttachment[]) =>
    onAttachmentsChange([...next, ...files]);
  const onFilesChange = (next: ReportAttachment[]) =>
    onAttachmentsChange([...minutes, ...next]);

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-8 py-8"
    >
      <MetaFields meta={report.meta} onChange={setMeta} />
      <SectionDiscussion rows={report.discussions} onChange={setDiscussions} />
      <SectionProgress areas={report.areas} onChange={setAreas} />
      <SectionMisc rows={report.miscs} onChange={setMiscs} />
      <SectionAttachments
        reportId={report.id}
        index="04"
        title="파일 첨부"
        kind="file"
        attachments={files}
        onChange={onFilesChange}
      />
      <SectionAttachments
        reportId={report.id}
        index="05"
        title="회의록 첨부"
        kind="minutes"
        attachments={minutes}
        onChange={onMinutesChange}
      />
    </form>
  );
}
