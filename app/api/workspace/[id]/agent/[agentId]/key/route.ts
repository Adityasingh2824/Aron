import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { fail, isSameOrigin, noStore, workspaceAccess } from '@/lib/api';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string;agentId:string}>}) {
  if(!isSameOrigin(request)) return fail('Invalid request origin',403);
  const {id,agentId}=await params;
  const auth=await workspaceAccess(id,['owner','admin']);
  if(!auth) return fail('Workspace access denied',403);
  const {data:agent}=await auth.supabase.from('agents').select('id').eq('id',agentId).eq('workspace_id',id).single();
  if(!agent) return fail('Agent not found',404);
  const key=`aron_live_${randomBytes(32).toString('base64url')}`;
  const hash=createHash('sha256').update(key).digest('hex');
  const {error}=await createServiceClient().from('agents').update({key_hash:hash,key_prefix:key.slice(0,20),key_revoked_at:null}).eq('id',agentId).eq('workspace_id',id);
  if(error) return fail('Could not rotate key',500);
  await createServiceClient().from('audit_events').insert({workspace_id:id,actor_id:auth.userId,actor_label:'Workspace administrator',action:'agent.key_rotated',detail:`Agent ${agentId} key issued or rotated`});
  return NextResponse.json({key,notice:'Copy this key now. It will not be shown again.'},{headers:noStore});
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string;agentId:string}>}) {
  if(!isSameOrigin(request)) return fail('Invalid request origin',403);
  const {id,agentId}=await params;
  const auth=await workspaceAccess(id,['owner','admin']);
  if(!auth) return fail('Workspace access denied',403);
  const {data:agent}=await auth.supabase.from('agents').select('id').eq('id',agentId).eq('workspace_id',id).single();
  if(!agent) return fail('Agent not found',404);
  const {error}=await createServiceClient().from('agents').update({key_hash:null,key_revoked_at:new Date().toISOString()}).eq('id',agentId).eq('workspace_id',id);
  if(!error) await createServiceClient().from('audit_events').insert({workspace_id:id,actor_id:auth.userId,actor_label:'Workspace administrator',action:'agent.key_revoked',detail:`Agent ${agentId} key revoked`});
  return error?fail('Could not revoke key',500):NextResponse.json({revoked:true},{headers:noStore});
}
