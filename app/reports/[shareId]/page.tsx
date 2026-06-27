import { notFound } from "next/navigation";
import { ResultsDashboard } from "@/components/results-dashboard";
import { getSavedReportByShareId } from "@/lib/saved-reports";

export const dynamic = "force-dynamic";

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const report = await getSavedReportByShareId(shareId);

  if (!report) {
    notFound();
  }

  return (
    <ResultsDashboard
      initialResult={report.result_payload}
      readOnly
      savedReportShareId={report.share_id}
    />
  );
}
