// lib/billing.ts
// Phase 4 billing gate. Free trial: first 3 onboardings free, then 1 paid
// credit is consumed per new onboarding.
//
// WIRING (Task 4.1/4.2): inside your existing "invite new starter" server
// action, BEFORE creating the onboarding instance, call:
//
//   const ok = await consumeOnboardingSlot(employerId);
//   if (!ok) {
//     return { error: "billing_required" }; // redirect user to buy a credit
//   }
//
// ADJUST IMPORT if your path differs:
import { adminClient } from "@/lib/supabase/admin";

export const FREE_ONBOARDING_LIMIT = 3;

export type BillingState = {
  onboardingsUsed: number;
  freeLimit: number;
  paidCredits: number;
  canStart: boolean;
  freeRemaining: number;
};

export async function getBillingState(employerId: string): Promise<BillingState | null> {
  const { data } = await adminClient
    .from("employer_accounts")
    .select("onboardings_used, paid_credits")
    .eq("id", employerId)
    .maybeSingle();

  if (!data) return null;

  const used = data.onboardings_used ?? 0;
  const credits = data.paid_credits ?? 0;
  return {
    onboardingsUsed: used,
    freeLimit: FREE_ONBOARDING_LIMIT,
    paidCredits: credits,
    canStart: used < FREE_ONBOARDING_LIMIT || credits > 0,
    freeRemaining: Math.max(0, FREE_ONBOARDING_LIMIT - used),
  };
}

// Atomic: uses the consume_onboarding_slot() Postgres function from
// migration 002 so two simultaneous invitations cannot double-spend a credit.
export async function consumeOnboardingSlot(employerId: string): Promise<boolean> {
  const { data, error } = await adminClient.rpc("consume_onboarding_slot", {
    p_employer_id: employerId,
  });
  if (error) return false;
  return data === true;
}
