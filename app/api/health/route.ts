import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
export function GET() { return NextResponse.json({ ok: true, mode: isSupabaseConfigured() ? 'workspace' : process.env.VERCEL ? 'setup-required' : 'fictional-demo', billingConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) }); }
