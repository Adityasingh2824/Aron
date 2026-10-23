import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { authenticatedClient } from '@/lib/supabase/server';
import Dashboard from './workspace-dashboard';

export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <main className="auth-screen"><div className="auth-card"><h1>Connect Supabase to continue.</h1><p>Follow the setup instructions in the README, then sign in to create your workspace.</p></div></main>;
  const auth = await authenticatedClient();
  if (!auth) redirect('/login');
  return <Dashboard userId={auth.userId}/>;
}
