import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, isSameOrigin, noStore, readJson, workspaceAccess } from '@/lib/api';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; approvalId: string }> }) {
  if (!isSameOrigin(request)) return fail('Invalid request origin',403);
  const { id, approvalId } = await params;
  const auth = await workspaceAccess(id, ['owner','admin']);
  if (!auth) return fail('Workspace access denied',403);
  const { data: approval } = await auth.supabase.from('approvals').select('id').eq('id',approvalId).eq('workspace_id',id).single();
  if (!approval) return fail('Approval not found',404);
  try {
    const body = z.object({ decision:z.enum(['approved','rejected']), reason:z.string().trim().min(3).max(500) }).parse(await readJson(request));
    const { data, error } = await auth.supabase.rpc('decide_refund_approval', { approval_id:approvalId, decision:body.decision, decision_reason:body.reason });
    return error ? fail('Approval was already decided or could not be updated',409) : NextResponse.json({ runId:data }, { headers:noStore });
  } catch { return fail('A decision and reason are required'); }
}
