// components/ExportButtons.tsx
// Two small client components for Task 3.6.
//
// EmployerExportButton -> place on the employer dashboard (e.g. next to the
//   onboardings list header). Pass onboardingId to export a single onboarding
//   from the detail page, or leave blank for a bulk export.
// SarExportButton -> place on the employee profile / settings page.

"use client";

import { useState } from "react";

function useDownload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(url: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Export failed. Please try again.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : "export.csv";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch {
      setError("Export failed. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, download };
}

export function EmployerExportButton({
  onboardingId,
  completedOnly = false,
}: {
  onboardingId?: string;
  completedOnly?: boolean;
}) {
  const { busy, error, download } = useDownload();

  const params = new URLSearchParams();
  if (onboardingId) params.set("onboardingId", onboardingId);
  if (completedOnly) params.set("status", "completed");
  const qs = params.toString();
  const url = "/api/export/onboardings" + (qs ? "?" + qs : "");

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => download(url)}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-line-strong bg-ink-raised px-3 py-2 text-sm font-medium text-fg-body shadow-sm hover:bg-ink-inset disabled:opacity-50"
      >
        {busy ? "Preparing export..." : onboardingId ? "Export this onboarding (CSV)" : "Export all onboardings (CSV)"}
      </button>
      {error ? <p className="text-xs text-status-rejected">{error}</p> : null}
    </div>
  );
}

export function SarExportButton() {
  const { busy, error, download } = useDownload();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => download("/api/export/my-data")}
        disabled={busy}
        className="inline-flex w-fit items-center gap-2 rounded-md border border-line-strong bg-ink-raised px-3 py-2 text-sm font-medium text-fg-body shadow-sm hover:bg-ink-inset disabled:opacity-50"
      >
        {busy ? "Preparing your data..." : "Download my data (CSV)"}
      </button>
      <p className="text-xs text-fg-muted">
        A copy of all personal data we hold about you, in line with UK GDPR.
      </p>
      {error ? <p className="text-xs text-status-rejected">{error}</p> : null}
    </div>
  );
}
