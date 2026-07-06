// app/api/export/my-data/route.ts
// Task 3.6 (employee side): GDPR Subject Access Request export.
// GET /api/export/my-data -> CSV of everything held about the signed-in employee.
//
// Sensitive encrypted fields are decrypted for the data subject only --
// this route authenticates as the employee and exports their own data,
// which UK GDPR Article 15 requires in an intelligible form.
//
// ADJUST IMPORTS if your paths differ:
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
const adminClient = createAdminClient();
import { decryptField } from "@/lib/encryption"; // AES-256-GCM util from Task 2.2
import { csvRow } from "@/lib/csv";

function safeDecrypt(value: string | null): string {
  if (!value) return "";
  try {
    return decryptField(value);
  } catch {
    return "(could not decrypt)";
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Not authenticated", { status: 401 });
  }

  const { data: profile } = await adminClient
    .from("employee_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return new Response("No employee profile found", { status: 404 });
  }

  const lines: string[] = [];
  const section = (title: string) => {
    if (lines.length > 0) lines.push("");
    lines.push(csvRow(["SECTION", title]));
  };

  // 1. Profile
  section("Personal profile");
  lines.push(csvRow(["field", "value"]));
  lines.push(csvRow(["full_name", profile.full_name]));
  lines.push(csvRow(["email", profile.email]));
  lines.push(csvRow(["date_of_birth", profile.date_of_birth]));
  lines.push(csvRow(["address", profile.address]));
  lines.push(csvRow(["phone", profile.phone]));
  lines.push(csvRow(["ni_number", safeDecrypt(profile.ni_number_encrypted)]));
  lines.push(csvRow(["bank_sort_code", safeDecrypt(profile.bank_sort_code_encrypted)]));
  lines.push(csvRow(["bank_account_number", safeDecrypt(profile.bank_account_number_encrypted)]));
  lines.push(csvRow(["right_to_work_status", profile.right_to_work_status]));
  lines.push(csvRow(["right_to_work_expiry", profile.right_to_work_expiry]));

  // 2. Emergency contacts (JSONB array)
  section("Emergency contacts");
  lines.push(csvRow(["name", "relationship", "phone"]));
  const contacts = Array.isArray(profile.emergency_contacts)
    ? profile.emergency_contacts
    : [];
  for (const c of contacts) {
    lines.push(csvRow([c?.name, c?.relationship, c?.phone]));
  }

  // 3. Documents
  section("Uploaded documents");
  lines.push(csvRow(["document_type", "data_category", "verification_status", "expiry_date", "uploaded_at"]));
  const { data: docs } = await adminClient
    .from("document_uploads")
    .select("document_type, data_category, verification_status, expiry_date, created_at")
    .eq("employee_id", profile.id)
    .order("created_at", { ascending: false });
  for (const d of docs || []) {
    lines.push(csvRow([d.document_type, d.data_category, d.verification_status, d.expiry_date, d.created_at]));
  }

  // 4. Onboardings (two-step: instances, then employer names)
  section("Onboardings");
  lines.push(csvRow(["employer", "role_title", "start_date", "status", "created_at"]));
  const { data: onboardings } = await adminClient
    .from("onboarding_instances")
    .select("employer_id, role_title, start_date, status, created_at")
    .eq("employee_id", profile.id)
    .order("created_at", { ascending: false });

  const employerIds = Array.from(new Set((onboardings || []).map((o) => o.employer_id)));
  const employerNames = new Map<string, string>();
  if (employerIds.length > 0) {
    const { data: employers } = await adminClient
      .from("employer_accounts")
      .select("id, company_name")
      .in("id", employerIds);
    for (const e of employers || []) {
      employerNames.set(e.id, e.company_name);
    }
  }
  for (const o of onboardings || []) {
    lines.push(
      csvRow([
        employerNames.get(o.employer_id) || o.employer_id,
        o.role_title,
        o.start_date,
        o.status,
        o.created_at,
      ])
    );
  }

  // 5. Consent records
  section("Consent history");
  lines.push(csvRow(["employer", "data_category", "action", "recorded_at"]));
  const { data: consents } = await adminClient
    .from("consent_records")
    .select("employer_id, data_category, action, created_at")
    .eq("employee_id", profile.id)
    .order("created_at", { ascending: false });
  for (const c of consents || []) {
    lines.push(
      csvRow([
        employerNames.get(c.employer_id) || c.employer_id,
        c.data_category,
        c.action,
        c.created_at,
      ])
    );
  }

  // 6. Audit trail entries about this employee
  section("Audit log");
  lines.push(csvRow(["action", "resource_type", "actor_type", "recorded_at"]));
  const { data: audit } = await adminClient
    .from("audit_log")
    .select("action, resource_type, actor_type, created_at")
    .eq("employee_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1000);
  for (const a of audit || []) {
    lines.push(csvRow([a.action, a.resource_type, a.actor_type, a.created_at]));
  }

  // Record the SAR export itself
  await adminClient.from("audit_log").insert({
    actor_id: user.id,
    actor_type: "employee",
    action: "data_exported",
    resource_type: "employee_profile",
    resource_id: profile.id,
    employee_id: profile.id,
    metadata: { export_type: "sar_csv" },
  });

  const csv = lines.join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-data-export-' + stamp + '.csv"',
      "Cache-Control": "no-store",
    },
  });
}
