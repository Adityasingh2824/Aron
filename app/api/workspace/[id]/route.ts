import { NextResponse } from 'next/server';
import { fail, noStore, workspaceAccess } from '@/lib/api';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await workspaceAccess(id);
  if (!auth) return fail('Workspace access denied', 403);
  const db = auth.supabase;
  const [workspace, runs, events, approvals, policies, agents, audit, usage, subscription] = await Promise.all([
    db.from('workspaces').select('id,name').eq('id',id).single(),
    db.from('runs').select('*').eq('workspace_id',id).order('started_at',{ascending:false}).limit(100),
    db.from('run_events').select('*').eq('workspace_id',id).order('created_at',{ascending:false}).limit(500),
    db.from('approvals').select('*').eq('workspace_id',id).order('created_at',{ascending:false}).limit(100),
    db.from('policies').select('*').eq('workspace_id',id),
    db.from('agents').select('id,name,environment,key_prefix,key_revoked_at,created_at').eq('workspace_id',id),
    db.from('audit_events').select('*').eq('workspace_id',id).order('created_at',{ascending:false}).limit(100),
    db.from('usage_records').select('*').eq('workspace_id',id).order('period_start',{ascending:false}).limit(12),
    db.from('subscriptions').select('plan,status,period_end').eq('workspace_id',id).single(),
  ]);
  const results = [workspace,runs,events,approvals,policies,agents,audit,usage,subscription];
  if (results.some(result => result.error)) return fail('Could not load workspace state',500);
  return NextResponse.json({ workspace: workspace.data, role: auth.role, runs: runs.data, events: events.data, approvals: approvals.data, policies: policies.data, agents: agents.data, audit: audit.data, usage: usage.data, subscription: subscription.data }, { headers: noStore });
}
