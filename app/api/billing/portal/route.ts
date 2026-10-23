import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, isSameOrigin, noStore, readJson, workspaceAccess } from '@/lib/api';
import { stripeClient } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail('Invalid request origin',403);
  let workspaceId: string;
  try { workspaceId = z.object({ workspaceId:z.string().uuid() }).parse(await readJson(request)).workspaceId; }
  catch { return fail('Invalid workspace'); }
  if (!process.env.NEXT_PUBLIC_APP_URL) return fail('Billing is not configured',503);
  const auth = await workspaceAccess(workspaceId,['owner','admin']);
  if (!auth) return fail('Workspace access denied',403);
  const { data } = await createServiceClient().from('subscriptions').select('stripe_customer_id').eq('workspace_id',workspaceId).single();
  if (!data?.stripe_customer_id) return fail('No billing customer exists yet',404);
  const session = await stripeClient().billingPortal.sessions.create({ customer:data.stripe_customer_id, return_url:`${process.env.NEXT_PUBLIC_APP_URL}/dashboard` });
  return NextResponse.json({ url:session.url }, { headers:noStore });
}
