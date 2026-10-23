import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import DemoConsole from './demo-console';

export default function ConsolePage() {
  if (isSupabaseConfigured()) redirect('/dashboard');
  if (process.env.VERCEL) redirect('/login');
  return <DemoConsole/>;
}
