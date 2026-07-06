// app/api/webhooks/stripe/route.ts
// Task 4.1: Stripe webhook. Credits are only granted here, after payment is
// confirmed -- never on the client redirect.
//
// Setup:
// 1. Stripe Dashboard -> Developers -> Webhooks -> Add endpoint:
//    https://<your-domain>/api/webhooks/stripe
//    Event: checkout.session.completed
// 2. Put the signing secret in STRIPE_WEBHOOK_SECRET
// 3. IMPORTANT: exclude /api/webhooks/stripe from your auth middleware
//    matcher (same pattern as the cron routes).
//
// ADJUST IMPORTS if your paths differ:
import { createAdminClient } from "@/lib/supabase/admin";
const adminClient = createAdminClient();
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_status: string;
      amount_total: number | null;
      metadata: Record<string, string> | null;
    };

    if (session.payment_status === "paid") {
      const employerId = session.metadata?.employer_id;
      const credits = parseInt(session.metadata?.credits || "1", 10) || 1;

      if (employerId) {
        // Idempotency: skip if this session was already processed
        const { data: existing } = await adminClient
          .from("audit_log")
          .select("id")
          .eq("action", "payment_completed")
          .eq("resource_id", session.id)
          .maybeSingle();

        if (!existing) {
          const { data: employer } = await adminClient
            .from("employer_accounts")
            .select("paid_credits")
            .eq("id", employerId)
            .maybeSingle();

          if (employer) {
            await adminClient
              .from("employer_accounts")
              .update({ paid_credits: (employer.paid_credits ?? 0) + credits })
              .eq("id", employerId);

            await adminClient.from("audit_log").insert({
              actor_id: null,
              actor_type: "system",
              action: "payment_completed",
              resource_type: "stripe_checkout_session",
              resource_id: session.id,
              employer_id: employerId,
              metadata: {
                credits_added: credits,
                amount_total_pence: session.amount_total,
              },
            });
          }
        }
      }
    }
  }

  return Response.json({ received: true });
}
