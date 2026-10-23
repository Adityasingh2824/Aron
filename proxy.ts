import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) { return updateSession(request); }

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/api/workspaces/:path*', '/api/workspace/:path*', '/api/billing/:path*'],
};
