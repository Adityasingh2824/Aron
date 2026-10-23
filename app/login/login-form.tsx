'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const supabase = createClient();
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
        if (error) throw error;
        setMessage('Check your email for a confirmation link, then return to sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/dashboard'); router.refresh();
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Authentication failed'); }
    finally { setBusy(false); }
  }
  return <><div className="auth-tabs"><button className={mode==='signin'?'active':''} onClick={() => setMode('signin')}>Sign in</button><button className={mode==='signup'?'active':''} onClick={() => setMode('signup')}>Create account</button></div><form onSubmit={submit}><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}/><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete={mode==='signin'?'current-password':'new-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)}/><button className="button button-cyan" disabled={busy} type="submit">{busy ? 'Working…' : mode==='signin'?'Sign in':'Create account'}</button></form>{message && <p role="status" className="auth-message">{message}</p>}</>;
}
