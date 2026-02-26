import type { ScanResult } from "@/types";

function escapeCSV(value: string): string {
  const cleaned = value.replace(/"/g, "'").replace(/[\n\r]/g, " ");
  return `"${cleaned}"`;
}

export function exportScanToCSV(results: ScanResult, clientName: string): void {
  if (!results.items.length) return;

  const headers = [
    "Threat Level",
    "Score",
    "Page Name",
    "Page ID",
    "Ad Body",
    "Destination URLs",
    "Risk Factors",
    "Start Date",
    "Status",
    "Ad Library Link",
  ];

  const rows = results.items.map((item) => {
    const body = (item.ad.ad_creative_bodies?.[0] ?? "").slice(0, 200);
    const urls = (item.ad.ad_creative_link_captions ?? []).join(" | ");
    const risks = item.analysis.risks.map((r) => r.label).join("; ");
    const status = item.ad.ad_delivery_stop_time ? "Inactive" : "Active";
    const link = `https://www.facebook.com/ads/library/?id=${item.ad.id}`;

    return [
      item.analysis.threat.toUpperCase(),
      item.analysis.score.toString(),
      escapeCSV(item.ad.page_name ?? ""),
      item.ad.page_id,
      escapeCSV(body),
      escapeCSV(urls),
      escapeCSV(risks),
      item.ad.ad_delivery_start_time ?? "",
      status,
      link,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `cert-scan-${clientName.replace(/\s/g, "-")}-${dateStr}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}