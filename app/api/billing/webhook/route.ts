import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeClient } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response('Missing webhook signature', { status:400 });
  const raw = await request.text();
  if (raw.length > 1024 * 1024) return new Response('Payload too large', { status:413 });
  let event: Stripe.Event;
  const stripe = stripeClient();
  try { event = stripe.webhooks.constructEvent(raw, signature, secret); }
  catch { return new Response('Invalid webhook signature', { status:400 }); }
  let subscription: Stripe.Subscription | null = null;
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === 'subscription' && typeof session.subscription === 'string') subscription = await stripe.subscriptions.retrieve(session.subscription);
  } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    subscription = event.data.object as Stripe.Subscription;
  }
  if (!subscription) return NextResponse.json({ received:true });
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  if (priceId !== process.env.STRIPE_TEAM_PRICE_ID) return NextResponse.json({ received:true, ignored:'unknown price' });
  const periodEnd = subscription.items.data[0]?.current_period_end;
  const { error } = await createServiceClient().rpc('apply_stripe_subscription_event', {
    event_id:event.id, event_type:event.type, customer_id:customerId, subscription_id:subscription.id,
    price_id:priceId, subscription_status:subscription.status,
    period_end_value:periodEnd ? new Date(periodEnd*1000).toISOString() : null, event_created:event.created,
  });
  if (error) return new Response('Webhook processing failed', { status:500 });
  return NextResponse.json({ received:true });
}
