import { NextResponse } from 'next/server';
import { fail, isSameOrigin, noStore, readJson, workspaceAccess } from '@/lib/api';
import { billingConfigured, stripeClient } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail('Invalid request origin',403);
  if (!billingConfigured()) return fail('Billing is not configured',503);
  let workspaceId: string;
  try { workspaceId = z.object({ workspaceId:z.string().uuid() }).parse(await readJson(request)).workspaceId; }
  catch { return fail('Invalid workspace'); }
  const auth = await workspaceAccess(workspaceId, ['owner','admin']);
  if (!auth) return fail('Workspace access denied',403);
  const admin = createServiceClient();
  const { data: subscription, error } = await admin.from('subscriptions').select('*').eq('workspace_id',workspaceId).single();
  if (error || !subscription) return fail('Billing record unavailable',500);
  if (subscription.status === 'active' || subscription.status === 'trialing') return fail('Manage the current subscription in the billing portal',409);
  const stripe = stripeClient();
  let customerId = subscription.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata:{ workspaceId } }, { idempotencyKey:`aron-customer-${workspaceId}` });
    customerId = customer.id;
    const { error: saveError } = await admin.from('subscriptions').update({ stripe_customer_id:customerId }).eq('workspace_id',workspaceId).is('stripe_customer_id',null);
    if (saveError) return fail('Could not save billing customer',500);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const session = await stripe.checkout.sessions.create({ mode:'subscription', customer:customerId, line_items:[{ price:process.env.STRIPE_TEAM_PRICE_ID!, quantity:1 }], client_reference_id:workspaceId, metadata:{ workspaceId }, subscription_data:{ metadata:{ workspaceId } }, success_url:`${appUrl}/dashboard?billing=return`, cancel_url:`${appUrl}/dashboard?billing=cancel` });
  return NextResponse.json({ url:session.url }, { headers:noStore });
}
