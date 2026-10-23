import { NextResponse } from 'next/server';
import { authenticatedClient } from '@/lib/supabase/server';

export const noStore = { 'Cache-Control': 'private, no-store' };
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: noStore });
export function isSameOrigin(request: Request) {
  const origin=request.headers.get('origin');
  return Boolean(origin && origin===new URL(request.url).origin);
}

export async function workspaceAccess(id: string, roles?: string[]) {
  const auth = await authenticatedClient();
  if (!auth) return null;
  const { data, error } = await auth.supabase.from('memberships').select('role').eq('workspace_id', id).eq('user_id', auth.userId).single();
  if (error || !data || (roles && !roles.includes(data.role))) return null;
  return { ...auth, role: data.role as string };
}

export async function readJson(request: Request, max = 4096): Promise<unknown> {
  const raw = await request.text();
  if (raw.length > max) throw new Error('Request too large');
  return JSON.parse(raw);
}
