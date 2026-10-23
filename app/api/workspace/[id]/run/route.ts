import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, isSameOrigin, noStore, readJson, workspaceAccess } from '@/lib/api';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return fail('Invalid request origin',403);
  const { id } = await params;
  const auth = await workspaceAccess(id, ['owner','admin','member']);
  if (!auth) return fail('Workspace access denied',403);
  try {
    const body = z.object({ amountCents: z.number().int().min(1).max(1000000), customer: z.string().trim().min(1).max(80) }).parse(await readJson(request));
    const { data, error } = await auth.supabase.rpc('run_refund_demo', { wid:id, amount:body.amountCents, customer:body.customer });
    return error ? fail('Could not run scenario',400) : NextResponse.json({ id:data }, { status:201, headers:noStore });
  } catch { return fail('Invalid scenario'); }
}
