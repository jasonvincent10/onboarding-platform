// app/api/billing/portal/route.ts
// Creates a Stripe Billing Portal session so an employer can manage their
// payment method and view invoices via Stripe's own hosted UI.
// POST /api/billing/portal -- returns { url } to redirect the browser to.
//
// Requires the Customer Portal to be activated in the Stripe Dashboard
// (Settings -> Billing -> Customer portal) -- if it isn't, Stripe rejects
// session creation and the real error is returned below rather than a
// generic failure.
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const { data: membership } = await adminClient
    .from("employer_members")
    .select("employer_id, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return Response.json({ error: "Not an employer account" }, { status: 403 });
  }

  const { data: employer } = await adminClient
    .from("employer_accounts")
    .select("id, company_name, stripe_customer_id")
    .eq("id", membership.employer_id)
    .maybeSingle();

  if (!employer) {
    return Response.json({ error: "Employer account not found" }, { status: 404 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();

  try {
    const stripe = getStripe();

    // Mirrors the checkout route's get-or-create pattern -- an employer
    // who has never bought a credit yet won't have a Stripe customer.
    let customerId = employer.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: membership.email || user.email || undefined,
        name: employer.company_name,
        metadata: { employer_id: employer.id },
      });
      customerId = customer.id;
      await adminClient
        .from("employer_accounts")
        .update({ stripe_customer_id: customerId })
        .eq("id", employer.id);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: appUrl + "/settings/billing",
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe billing portal session creation failed:", err);
    const message = err instanceof Error ? err.message : "Could not open billing portal.";
    return Response.json({ error: message }, { status: 502 });
  }
}
