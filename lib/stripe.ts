import Stripe from 'stripe';

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe secret key is not configured');
  if (process.env.NODE_ENV === 'production' && !key.startsWith('sk_live_')) throw new Error('Live Stripe key required for production billing');
  return new Stripe(key);
}
export function billingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_TEAM_PRICE_ID && process.env.STRIPE_WEBHOOK_SECRET && process.env.NEXT_PUBLIC_APP_URL);
}
