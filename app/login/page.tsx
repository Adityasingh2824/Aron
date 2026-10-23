import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import LoginForm from './login-form';

export default function LoginPage() {
  return <main className="auth-screen"><div className="auth-card"><Link href="/" className="brand"><span className="brand-mark"><span/></span>aron<span className="brand-dot">.</span></Link><div className="console-eyebrow">YOUR CONTROL PLANE</div><h1>Sign in to Aron<span>.</span></h1><p>Trace agent runs and keep consequential actions under human control.</p>{isSupabaseConfigured() ? <LoginForm/> : <div className="auth-notice">Authentication is not connected yet. Configure a Supabase project as described in the README. The <Link href="/console">fictional local demo</Link> remains available.</div>}</div></main>;
}
