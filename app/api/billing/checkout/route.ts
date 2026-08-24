// app/api/billing/checkout/route.ts
// Task 4.1: create a Stripe Checkout session to buy one hire credit.
// POST /api/billing/checkout  (optionally { quantity: number } in JSON body)
// Returns { url } to redirect the browser to.
//
// ADJUST IMPORTS if your paths differ:
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
const adminClient = createAdminClient();
import { getStripe, getHirePricePence } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: membership } = await adminClient
    .from("employer_members")
    .select("employer_id, email, full_name")
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

  let quantity = 1;
  try {
    const body = await request.json();
    if (body && Number.isInteger(body.quantity) && body.quantity > 0 && body.quantity <= 50) {
      quantity = body.quantity;
    }
  } catch {
    // no body -> default quantity 1
  }

  // .trim() guards against a stray leading/trailing space in the env var
  // value silently producing an invalid success_url/cancel_url (Stripe
  // rejects a URL with leading whitespace with a generic "not a valid URL"
  // error that gives no hint it's a whitespace issue).
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();

  try {
    const stripe = getStripe();

    // Reuse or create the Stripe customer
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          quantity,
          price_data: {
            currency: "gbp",
            unit_amount: getHirePricePence(),
            product_data: {
              name: "Onboarding credit",
              description: "One new starter onboarding on Vopria",
            },
          },
        },
      ],
      // Automatic tax calculation is deliberately disabled for now -- it
      // requires a saved address on the Customer object (ours has none,
      // since we don't collect one anywhere), and whether/how to charge
      // VAT at all is a business decision to make properly, not configure
      // under time pressure while debugging a checkout flow. Revisit this
      // intentionally later, not as a side effect of a bug fix.
      invoice_creation: { enabled: true },
      metadata: {
        employer_id: employer.id,
        credits: String(quantity),
      },
      success_url: appUrl + "/dashboard?billing=success",
      cancel_url: appUrl + "/dashboard?billing=cancelled",
    });

    return Response.json({ url: session.url });
  } catch (err) {
    // Surface the real Stripe error instead of letting an unhandled
    // exception crash the route into a non-JSON 500 -- that made every
    // failure here look like a generic "check your connection" error on
    // the client with no way to tell what was actually wrong.
    console.error("Stripe checkout session creation failed:", err);
    const message = err instanceof Error ? err.message : "Could not create checkout session.";
    // Stripe SDK errors carry a `param` naming exactly which request field
    // was rejected, when available -- worth keeping in the response since
    // it's cheap and meaningfully narrows down future failures here.
    const param = err && typeof err === "object" && "param" in err ? (err as { param?: string }).param : undefined;
    return Response.json({ error: param ? `${message} (param: ${param})` : message }, { status: 502 });
  }
}
