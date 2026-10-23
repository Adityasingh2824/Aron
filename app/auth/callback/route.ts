import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!isSupabaseConfigured()) return NextResponse.redirect(`${origin}/login?error=not-configured`);
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/login?error=confirmation-failed`);
}
