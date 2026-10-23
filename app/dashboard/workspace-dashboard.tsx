'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowRight, CreditCard, Fingerprint, GitBranch, LayoutDashboard, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Workspace = { id:string; name:string };
type Run = { id:string; status:string; customer_label:string; amount_cents:number; verdict:string; started_at:string; cost_micros:number };
type Event = { id:string; run_id:string; sequence:number; event_type:string; name:string; status:string; detail:string };
type Approval = { id:string; run_id:string; status:string; reason:string|null; created_at:string };
type Policy = { id:string; name:string; action_name:string; allow_max_cents:number; approval_max_cents:number; version:number };
type Agent = { id:string; name:string; environment:string; key_prefix:string|null };
type Audit = { id:string; action:string; detail:string; actor_label:string; created_at:string };
type State = { workspace:Workspace; role:string; runs:Run[]; events:Event[]; approvals:Approval[]; policies:Policy[]; agents:Agent[]; audit:Audit[]; usage:{period_start:string;traced_runs:number}[]; subscription:{plan:string;status:string;period_end:string|null} };
type Tab = 'overview'|'runs'|'approvals'|'policies'|'agents'|'usage'|'audit';
const nav = [
  { id:'overview', label:'Overview', icon:LayoutDashboard },{ id:'runs', label:'Runs', icon:GitBranch },{ id:'approvals', label:'Approvals', icon:Fingerprint },{ id:'policies', label:'Policies', icon:ShieldCheck },{ id:'agents', label:'Agents', icon:Sparkles },{ id:'usage', label:'Usage & billing', icon:CreditCard },{ id:'audit', label:'Audit log', icon:Activity },
] as const;
const money = (cents:number) => `$${(cents/100).toFixed(2)}`;
const date = (value:string) => new Date(value).toLocaleString();

export default function Dashboard({ userId }: { userId:string }) {
  const [workspaces,setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId,setWorkspaceId] = useState('');
  const [state,setState] = useState<State|null>(null);
  const [tab,setTab] = useState<Tab>('overview');
  const [selected,setSelected] = useState<string|null>(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [name,setName] = useState('My workspace');
  const [amount,setAmount] = useState('240');
  const [reason,setReason] = useState('Reviewed the fictional request and approved for simulation.');
  const [showMobileNav,setShowMobileNav] = useState(false);
  const [issuedKey,setIssuedKey] = useState<string|null>(null);
  const loadWorkspaces = useCallback(async () => {
    const response = await fetch('/api/workspaces',{cache:'no-store'});
    const json = await response.json();
    if (!response.ok) throw new Error(json.error);
    setWorkspaces(json.workspaces);
    setWorkspaceId(current => current || json.workspaces[0]?.id || '');
  },[]);
  const loadState = useCallback(async () => {
    if (!workspaceId) return;
    const response = await fetch(`/api/workspace/${workspaceId}`,{cache:'no-store'});
    const json = await response.json();
    if (!response.ok) throw new Error(json.error);
    setState(json);
  },[workspaceId]);
  useEffect(() => { void loadWorkspaces().catch(e => setError(e.message)); },[loadWorkspaces]);
  useEffect(() => { setState(null); void loadState().catch(e => setError(e.message)); },[loadState]);
  async function action(url:string, body:object) {
    setBusy(true); setError('');
    try {
      const response = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Request failed');
      await loadState();
      return json;
    } catch(e) { setError(e instanceof Error ? e.message : 'Request failed'); return null; }
    finally { setBusy(false); }
  }
  async function createWorkspace() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/workspaces',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      await loadWorkspaces(); setWorkspaceId(json.id);
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not create workspace'); }
    finally { setBusy(false); }
  }
  async function run(cents:number) {
    const result = await action(`/api/workspace/${workspaceId}/run`,{amountCents:cents,customer:'Demo customer'});
    if (result?.id) { setSelected(result.id); setTab('runs'); }
  }
  async function billing(path:'checkout'|'portal') {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/billing/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspaceId})});
      const json = await response.json();
      if (!response.ok || !json.url) throw new Error(json.error || 'Billing unavailable');
      window.location.assign(json.url);
    } catch(e) { setError(e instanceof Error ? e.message : 'Billing unavailable'); setBusy(false); }
  }
  async function agentKey(agentId:string,method:'POST'|'DELETE') {
    setBusy(true);setError('');setIssuedKey(null);
    try {
      const response=await fetch(`/api/workspace/${workspaceId}/agent/${agentId}/key`,{method});
      const json=await response.json();
      if(!response.ok) throw new Error(json.error||'Key update failed');
      if(json.key) setIssuedKey(json.key);
      await loadState();
    } catch(e) { setError(e instanceof Error?e.message:'Key update failed'); }
    finally { setBusy(false); }
  }
  const pending = state?.approvals.filter(a => a.status==='pending') ?? [];
  const selectedRun = state?.runs.find(r => r.id===selected);
  const canReview = state?.role==='owner' || state?.role==='admin';
  return <div className="console-shell"><aside className={`console-sidebar ${showMobileNav?'mobile-open':''}`}><div className="console-logo"><Link href="/" className="brand"><span className="brand-mark"><span/></span>aron<span className="brand-dot">.</span></Link></div><div className="workspace-switch"><div className="workspace-avatar">{state?.workspace.name.charAt(0).toUpperCase() || 'A'}</div><div><b>{state?.workspace.name || 'Workspace'}</b><small>{state?.role || 'Member'} access</small></div></div><div className="sidebar-label">CONTROL PLANE</div><nav className="console-nav">{nav.map(item => { const Icon=item.icon; return <button key={item.id} className={tab===item.id?'active':''} onClick={() => {setTab(item.id);setSelected(null);setShowMobileNav(false);}}><Icon size={18}/>{item.label}{item.id==='approvals'&&pending.length>0&&<span className="nav-count">{pending.length}</span>}</button>; })}</nav><div className="sidebar-bottom"><div className="demo-mode"><span className="demo-spark"><ShieldCheck size={17}/></span><div><b>Protected workspace</b><p>Refund scenarios are fictional.</p></div></div><button className="back-site" onClick={async () => { await createClient().auth.signOut(); window.location.assign('/login'); }}>Sign out <ArrowRight size={16}/></button></div></aside><div className="console-body"><header className="console-topbar"><button className="mobile-menu" onClick={() => setShowMobileNav(true)}>Menu</button><div className="breadcrumb">Workspace / <b>{nav.find(n=>n.id===tab)?.label}</b></div><div className="topbar-right">SIGNED IN · {userId.slice(0,8)}</div></header><div className="console-content">
    {error&&<div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    {!workspaceId ? <div className="auth-card"><div className="console-eyebrow">GET STARTED</div><h1>Create your workspace<span>.</span></h1><p>Your runs, agents, and billing stay inside this workspace.</p><label htmlFor="workspace-name">Workspace name</label><input id="workspace-name" value={name} maxLength={80} onChange={e=>setName(e.target.value)}/><button className="console-primary" disabled={busy||name.trim().length<2} onClick={createWorkspace}>Create workspace <ArrowRight size={16}/></button></div> : !state ? <div className="loading-box">Loading workspace…</div> : <>
      <div className="page-head"><div><div className="console-eyebrow">ARON / {state.workspace.name.toUpperCase()}</div><h1>{nav.find(n=>n.id===tab)?.label}<span>.</span></h1><p>{tab==='overview'?'Your agent activity, policy decisions, and open approvals.':tab==='usage'?'Subscription state and recorded usage.':'Workspace scoped, authenticated records.'}</p></div><select aria-label="Switch workspace" value={workspaceId} onChange={e=>setWorkspaceId(e.target.value)}>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
      {tab==='overview'&&<><div className="demo-banner"><div className="demo-banner-icon"><ShieldCheck size={23}/></div><div><b>Watch the policy gate work</b><p>These refund runs are fictional. The $240 scenario pauses before any simulated tool step.</p></div><div className="demo-banner-actions"><button disabled={busy} onClick={()=>run(2499)}>Try $24.99 <ArrowRight size={15}/></button><button disabled={busy} onClick={()=>run(24000)}>Try $240 <ArrowRight size={15}/></button></div></div><div className="stat-grid"><Metric label="TRACED RUNS" value={String(state.runs.length)}/><Metric label="SUCCESSFUL" value={String(state.runs.filter(r=>r.status==='succeeded').length)}/><Metric label="PENDING APPROVALS" value={String(pending.length)}/><Metric label="PROVIDER COST" value={`$${(state.runs.reduce((n,r)=>n+Number(r.cost_micros),0)/1e6).toFixed(4)}`} note="Estimated for demo"/></div><div className="panel"><div className="panel-head"><h2>Recent runs</h2><button className="ghost-link" onClick={()=>setTab('runs')}>View all <ArrowRight size={15}/></button></div><RunList runs={state.runs.slice(0,6)} onSelect={id=>{setSelected(id);setTab('runs');}}/></div></>}
      {tab==='runs'&&<>{selectedRun?<><button className="outline-button" onClick={()=>setSelected(null)}>← All runs</button><div className="detail-grid" style={{marginTop:16}}><div className="panel"><div className="panel-head"><h2>Run timeline · {selectedRun.id.slice(0,8)}</h2><Badge value={selectedRun.status}/></div><div className="timeline">{state.events.filter(e=>e.run_id===selectedRun.id).sort((a,b)=>a.sequence-b.sequence).map(e=><div className="timeline-event" key={e.id}><div className="timeline-icon"><Activity size={16}/></div><div className="timeline-copy"><div><b>{e.name}</b><Badge value={e.status}/></div><p>{e.detail}</p><small>Step {e.sequence} · {e.event_type}</small></div></div>)}</div></div><div className="panel detail-card"><div className="panel-head"><h2>Run context</h2></div><div className="detail-row"><span>CUSTOMER</span><b>{selectedRun.customer_label}</b></div><div className="detail-row"><span>AMOUNT</span><b>{money(selectedRun.amount_cents)}</b></div><div className="detail-row"><span>POLICY</span><b>{selectedRun.verdict}</b></div></div></div></>:<><div className="panel"><RunList runs={state.runs} onSelect={setSelected}/></div><div className="quick-run"><div><b>Run a fictional refund</b><span>Integer cent thresholds determine allow, approval, or block.</span></div><div><span>$</span><input aria-label="Amount in dollars" type="number" min="0.01" max="10000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/><button className="console-primary" disabled={busy||!Number.isFinite(Number(amount))||Number(amount)<=0} onClick={()=>run(Math.round(Number(amount)*100))}><Play size={15}/> Run</button></div></div></>}</>}
      {tab==='approvals'&&<div className="approval-list">{state.approvals.length===0?<div className="empty-state"><Fingerprint size={28}/><h2>No approvals yet</h2><p>Run a fictional $240 request to create one.</p></div>:state.approvals.map(a=>{const r=state.runs.find(run=>run.id===a.run_id);return <div className="approval-card" key={a.id}><div className="approval-card-top"><div className="approval-icon"><Fingerprint size={20}/></div><div><span className="console-eyebrow">REFUND APPROVAL</span><h2>{r?money(r.amount_cents):'Run'} · {r?.customer_label}</h2></div><Badge value={a.status}/></div><p className="approval-explain">{a.reason||'The protected action is paused until a reviewer decides.'}</p>{a.status==='pending'&&canReview&&<><label htmlFor={`reason-${a.id}`}>Decision reason</label><textarea id={`reason-${a.id}`} value={reason} maxLength={500} onChange={e=>setReason(e.target.value)}/><div className="modal-actions"><button className="reject-button" disabled={busy||reason.trim().length<3} onClick={()=>void action(`/api/workspace/${workspaceId}/approval/${a.id}`,{decision:'rejected',reason})}>Reject</button><button className="console-primary" disabled={busy||reason.trim().length<3} onClick={()=>void action(`/api/workspace/${workspaceId}/approval/${a.id}`,{decision:'approved',reason})}>Approve fictional action</button></div></>}</div>})}</div>}
      {tab==='policies'&&<div className="policy-layout"><div className="panel">{state.policies.map(p=><div key={p.id}><div className="panel-head"><div><h2>{p.name}</h2><p>{p.action_name} · version {p.version}</p></div><ShieldCheck size={23}/></div><div className="policy-rule"><div className="rule-range">≤ {money(p.allow_max_cents)}</div><div><Badge value="allow"/><p>Simulated action allowed.</p></div></div><div className="policy-rule"><div className="rule-range">≤ {money(p.approval_max_cents)}</div><div><Badge value="approval"/><p>Human decision required.</p></div></div><div className="policy-rule"><div className="rule-range">Above maximum</div><div><Badge value="block"/><p>Action blocked.</p></div></div></div>)}</div><div className="panel policy-side"><h2>Deterministic boundary</h2><p>Policy evaluation happens in a database transaction before the simulator records an action.</p></div></div>}
      {tab==='agents'&&<>{state.agents.map(agent=><div className="panel agent-panel" key={agent.id}><div className="agent-symbol"><Sparkles size={27}/></div><div><div className="agent-title"><h2>{agent.name}</h2><span className="agent-environment">{agent.environment}</span></div><p>Workspace agent. The seeded support scenario uses a fictional model step and a protected simulator.</p><div className="agent-meta">{agent.key_prefix?<span>Key: {agent.key_prefix}…</span>:<span>No ingestion key issued</span>}</div>{canReview&&<div className="agent-actions"><button className="outline-button" disabled={busy} onClick={()=>agentKey(agent.id,'POST')}>{agent.key_prefix?'Rotate':'Issue'} ingestion key</button>{agent.key_prefix&&<button className="reject-button" disabled={busy} onClick={()=>agentKey(agent.id,'DELETE')}>Revoke key</button>}</div>}</div></div>)}{issuedKey&&<div className="panel key-reveal"><b>Copy this key now. It will not be shown again.</b><code>{issuedKey}</code><button onClick={()=>{void navigator.clipboard.writeText(issuedKey);}}>Copy key</button></div>}<div className="panel plan-panel"><h2>Production ingestion</h2><p>Send typed traces from your server using the SDK in <code>sdk/index.ts</code>. Never embed an agent key in a browser.</p></div></>}
      {tab==='usage'&&<div className="usage-grid"><div className="panel usage-large"><div className="panel-head"><h2>Recorded runs</h2><Activity size={20}/></div><div className="usage-number">{state.usage[0]?.traced_runs??0}</div><small>Current recorded period · fictional simulator usage</small></div><div className="panel usage-small"><span className="console-eyebrow">CURRENT PLAN</span><h2>{state.subscription.plan}</h2><p>Stripe status: {state.subscription.status}</p>{canReview&&(state.subscription.status==='active'||state.subscription.status==='trialing'?<button className="console-primary" disabled={busy} onClick={()=>billing('portal')}>Manage billing <ArrowRight size={15}/></button>:<button className="console-primary" disabled={busy} onClick={()=>billing('checkout')}>Open secure checkout <ArrowRight size={15}/></button>)}</div></div>}
      {tab==='audit'&&<div className="panel audit-panel">{state.audit.map(e=><div className="audit-row" key={e.id}><div className="audit-row-icon"><Activity size={17}/></div><div><b>{e.action}</b><p>{e.detail}</p><small>{e.actor_label}</small></div><span>{date(e.created_at)}</span></div>)}</div>}
    </>}
  </div></div></div>;
}
function Metric({label,value,note}:{label:string;value:string;note?:string}) { return <div className="stat-card"><div className="stat-icon"><Activity size={18}/></div><span>{label}</span><strong>{value}</strong><small>{note||'Workspace activity'}</small></div>; }
function Badge({value}:{value:string}) { return <span className={`status status-${value}`}><i/>{value.replaceAll('_',' ')}</span>; }
function RunList({runs,onSelect}:{runs:Run[];onSelect:(id:string)=>void}) { return <div className="table-wrap"><table className="runs-table"><thead><tr><th>RUN</th><th>CUSTOMER</th><th>AMOUNT</th><th>STATUS</th><th>STARTED</th></tr></thead><tbody>{runs.map(r=><tr key={r.id} tabIndex={0} onClick={()=>onSelect(r.id)} onKeyDown={e=>{if(e.key==='Enter')onSelect(r.id);}}><td className="run-id">{r.id.slice(0,8)}</td><td>{r.customer_label}</td><td>{money(r.amount_cents)}</td><td><Badge value={r.status}/></td><td>{date(r.started_at)}</td></tr>)}</tbody></table>{runs.length===0&&<div className="table-empty">No runs recorded yet.</div>}</div>; }
