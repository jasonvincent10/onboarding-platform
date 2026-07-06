// components/BillingUsage.tsx
// Task 4.2: trial usage counter + buy-credit button for the employer dashboard.
//
// Usage in a server component (e.g. dashboard page):
//   const billing = await getBillingState(employerId);
//   {billing ? <BillingUsage state={billing} /> : null}

"use client";

import { useState } from "react";

export type BillingUsageState = {
  onboardingsUsed: number;
  freeLimit: number;
  paidCredits: number;
  canStart: boolean;
  freeRemaining: number;
};

export function BillingUsage({ state }: { state: BillingUsageState }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buyCredit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Could not start checkout. Please try again.");
      }
    } catch {
      setError("Could not start checkout. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const inTrial = state.freeRemaining > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {inTrial
              ? "Free trial: " + state.freeRemaining + " of " + state.freeLimit + " free onboardings remaining"
              : "Free trial used"}
          </p>
          <p className="text-sm text-gray-500">
            {state.paidCredits > 0
              ? state.paidCredits + " paid onboarding credit" + (state.paidCredits === 1 ? "" : "s") + " available"
              : inTrial
                ? "No card needed during your trial."
                : "Buy a credit to invite your next new starter."}
          </p>
        </div>
        {!inTrial ? (
          <button
            type="button"
            onClick={buyCredit}
            disabled={busy}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Opening checkout..." : "Buy onboarding credit"}
          </button>
        ) : null}
      </div>
      {!state.canStart ? (
        <p className="mt-2 text-sm text-amber-700">
          You have used all free onboardings. Buy a credit to invite your next new starter.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
