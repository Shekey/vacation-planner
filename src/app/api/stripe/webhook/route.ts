import { handleStripeEvent, stripe } from "@/lib/stripe";

/** Stripe webhook. Only signed events are accepted; the signing secret comes from the Stripe dashboard. */
export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!s || !secret) return new Response("Billing is not configured", { status: 501 });
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event;
  try {
    event = await s.webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  await handleStripeEvent(event);
  return Response.json({ received: true });
}
