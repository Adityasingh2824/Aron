import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import DemoConsole from './demo-console';

export default function ConsolePage() {
  if (isSupabaseConfigured()) redirect('/dashboard');
  return <DemoConsole/>;
}
