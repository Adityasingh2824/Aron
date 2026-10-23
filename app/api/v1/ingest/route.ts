import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, noStore } from '@/lib/api';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime='nodejs';
const eventSchema=z.object({type:z.enum(['agent','model','tool','policy','approval','error']),name:z.string().min(1).max(120),status:z.string().min(1).max(40),detail:z.string().max(500).default('')}).strict();
const traceSchema=z.object({externalRunId:z.string().min(1).max(120),status:z.enum(['succeeded','failed','blocked']),events:z.array(eventSchema).min(1).max(100),inputTokens:z.number().int().min(0).max(10000000),outputTokens:z.number().int().min(0).max(10000000),costMicros:z.number().int().min(0).max(1000000000),costSource:z.enum(['provider','estimated'])}).strict();
function redact(value:string) {
  return value.replace(/\b(?:sk_(?:live|test)_[A-Za-z0-9]+|aron_live_[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9._-]+)\b/gi,'[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[EMAIL]');
}
export async function POST(request:Request) {
  const auth=request.headers.get('authorization');
  const key=auth?.startsWith('Bearer ')?auth.slice(7):null;
  if(!key||!key.startsWith('aron_live_')||key.length>100) return fail('Invalid agent key',401);
  const raw=await request.text();
  if(raw.length>65536) return fail('Payload too large',413);
  let body:z.infer<typeof traceSchema>;
  try { body=traceSchema.parse(JSON.parse(raw)); }
  catch { return fail('Invalid trace schema',400); }
  const keyHash=createHash('sha256').update(key).digest('hex');
  const events=body.events.map(event=>({...event,detail:redact(event.detail)}));
  const {data,error}=await createServiceClient().rpc('ingest_agent_run',{agent_key_hash:keyHash,external_id:body.externalRunId,run_status:body.status,events,input_count:body.inputTokens,output_count:body.outputTokens,cost_in_micros:body.costMicros,cost_kind:body.costSource});
  if(error) return fail(error.code==='42501'?'Invalid agent key':'Trace could not be ingested',error.code==='42501'?401:400);
  return NextResponse.json({runId:data},{status:202,headers:noStore});
}
