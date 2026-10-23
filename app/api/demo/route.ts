import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDemoRun, decideApproval, getDemoState } from '@/lib/demo-store';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const runSchema = z.object({ action: z.literal('run'), amountCents: z.number().int().positive().max(1000000), customer: z.string().trim().min(1).max(80).optional() });
const decisionSchema = z.object({ action: z.literal('decide'), approvalId: z.string().uuid(), choice: z.enum(['approved', 'rejected']), reason: z.string().trim().min(3).max(500) });

export async function GET() {
  if (isSupabaseConfigured() || process.env.VERCEL) return NextResponse.json({ error: 'Local demo unavailable on hosted deployments' }, { status: 404 });
  return NextResponse.json(getDemoState(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured() || process.env.VERCEL) return NextResponse.json({ error: 'Local demo unavailable on hosted deployments' }, { status: 404 });
  try {
    const raw = await request.text();
    if (raw.length > 2000) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    const body: unknown = JSON.parse(raw);
    const run = runSchema.safeParse(body);
    if (run.success) {
      const id = createDemoRun(run.data.amountCents, run.data.customer ?? 'Demo customer');
      return NextResponse.json({ id, ...getDemoState() });
    }
    const decision = decisionSchema.safeParse(body);
    if (decision.success) {
      decideApproval(decision.data.approvalId, decision.data.choice, decision.data.reason);
      return NextResponse.json(getDemoState());
    }
    return NextResponse.json({ error: 'Invalid demo request' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    return NextResponse.json({ error: message }, { status: message.includes('not found') ? 404 : 409 });
  }
}
