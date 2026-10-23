import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticatedClient } from '@/lib/supabase/server';
import { fail, isSameOrigin, noStore, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';
export async function GET() {
  const auth = await authenticatedClient();
  if (!auth) return fail('Sign in required', 401);
  const { data, error } = await auth.supabase.from('workspaces').select('id,name,created_at').order('created_at');
  return error ? fail('Could not load workspaces', 500) : NextResponse.json({ workspaces: data }, { headers: noStore });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail('Invalid request origin',403);
  const auth = await authenticatedClient();
  if (!auth) return fail('Sign in required', 401);
  try {
    const body = z.object({ name: z.string().trim().min(2).max(80) }).parse(await readJson(request));
    const { data, error } = await auth.supabase.rpc('create_workspace', { workspace_name: body.name });
    return error ? fail('Could not create workspace', 400) : NextResponse.json({ id: data }, { status: 201, headers: noStore });
  } catch { return fail('Enter a workspace name of 2–80 characters'); }
}
