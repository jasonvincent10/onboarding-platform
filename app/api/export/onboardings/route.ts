// app/api/export/onboardings/route.ts
// Task 3.6 (employer side): bulk CSV export of onboarding data.
// GET /api/export/onboardings            -> all onboardings for the employer
// GET /api/export/onboardings?status=completed -> filter by instance status
// GET /api/export/onboardings?onboardingId=<uuid> -> a single onboarding
//
// One row per checklist item, with the parent onboarding columns repeated,
// which imports cleanly into Excel / payroll tooling.
//
// ADJUST IMPORTS if your paths differ:
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
const adminClient = createAdminClient();
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Not authenticated", { status: 401 });
  }

  // Resolve employer via membership (two-step, no nested joins)
  const { data: membership } = await adminClient
    .from("employer_members")
    .select("employer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return new Response("Not an employer account", { status: 403 });
  }

  const employerId = membership.employer_id;
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");
  const onboardingId = url.searchParams.get("onboardingId");

  // Step 1: onboarding instances
  let instanceQuery = adminClient
    .from("onboarding_instances")
    .select(
      "id, invitee_name, invitee_email, role_title, start_date, status, readiness_pct, created_at"
    )
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    instanceQuery = instanceQuery.eq("status", statusFilter);
  }
  if (onboardingId) {
    instanceQuery = instanceQuery.eq("id", onboardingId);
  }

  const { data: instances, error: instErr } = await instanceQuery;
  if (instErr) {
    return new Response("Failed to load onboardings", { status: 500 });
  }
  if (!instances || instances.length === 0) {
    return new Response("No onboardings found for export", { status: 404 });
  }

  // Step 2: checklist items for those instances
  const instanceIds = instances.map((i) => i.id);
  const { data: items, error: itemErr } = await adminClient
    .from("checklist_items")
    .select(
      "onboarding_id, item_name, item_type, data_category, status, deadline, acknowledged_at, reviewer_notes, was_pre_populated"
    )
    .in("onboarding_id", instanceIds)
    .order("onboarding_id");

  if (itemErr) {
    return new Response("Failed to load checklist items", { status: 500 });
  }

  const instanceById = new Map(instances.map((i) => [i.id, i]));

  const headers = [
    "onboarding_id",
    "new_starter_name",
    "new_starter_email",
    "role_title",
    "start_date",
    "onboarding_status",
    "readiness_pct",
    "invited_at",
    "item_name",
    "item_type",
    "data_category",
    "item_status",
    "deadline",
    "acknowledged_at",
    "reviewer_notes",
    "pre_populated_from_profile",
  ];

  const rows: unknown[][] = (items || []).map((item) => {
    const inst = instanceById.get(item.onboarding_id);
    return [
      item.onboarding_id,
      inst?.invitee_name,
      inst?.invitee_email,
      inst?.role_title,
      inst?.start_date,
      inst?.status,
      inst?.readiness_pct,
      inst?.created_at,
      item.item_name,
      item.item_type,
      item.data_category,
      item.status,
      item.deadline,
      item.acknowledged_at,
      item.reviewer_notes,
      item.was_pre_populated ? "yes" : "no",
    ];
  });

  // Audit trail: record the export
  await adminClient.from("audit_log").insert({
    actor_id: user.id,
    actor_type: "employer",
    action: "data_exported",
    resource_type: "onboarding_instances",
    resource_id: onboardingId || null,
    employer_id: employerId,
    metadata: {
      export_type: "employer_csv",
      instance_count: instances.length,
      row_count: rows.length,
      status_filter: statusFilter || "all",
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(toCsv(headers, rows), "onboarding-export-" + stamp + ".csv");
}
