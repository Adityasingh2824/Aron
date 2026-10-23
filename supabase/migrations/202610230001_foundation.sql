-- Aron production schema. Apply in a dedicated Supabase project before enabling the hosted app.
create extension if not exists pgcrypto;
create schema if not exists private;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);
create index memberships_user_id_idx on public.memberships(user_id);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  environment text not null default 'development' check (environment in ('development','staging','production')),
  key_prefix text,
  key_hash text unique,
  key_revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index agents_workspace_idx on public.agents(workspace_id);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agent_id uuid not null references public.agents(id),
  status text not null check (status in ('running','succeeded','failed','awaiting_approval','blocked','rejected')),
  customer_label text,
  amount_cents integer check (amount_cents > 0),
  verdict text check (verdict in ('allow','approval','block')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_ms integer check (duration_ms >= 0),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  cost_micros bigint not null default 0 check (cost_micros >= 0),
  cost_source text not null default 'estimated' check (cost_source in ('provider','estimated')),
  source_run_id uuid references public.runs(id)
);
alter table public.runs add column external_run_id text;
create unique index runs_external_id_unique on public.runs(agent_id,external_run_id) where external_run_id is not null;
create index runs_workspace_time_idx on public.runs(workspace_id,started_at desc);
create index runs_agent_time_idx on public.runs(agent_id,started_at desc);

create table public.run_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  event_type text not null check (event_type in ('agent','model','tool','policy','approval','error')),
  name text not null check (char_length(name) between 1 and 120),
  status text not null,
  detail text not null default '',
  duration_ms integer check (duration_ms >= 0),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id,sequence)
);
create index run_events_workspace_run_idx on public.run_events(workspace_id,run_id,sequence);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  action_name text not null,
  allow_max_cents integer not null default 5000 check (allow_max_cents > 0),
  approval_max_cents integer not null default 50000 check (approval_max_cents > allow_max_cents),
  version integer not null default 1,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id,action_name)
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reason text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (run_id)
);
create index approvals_workspace_status_idx on public.approvals(workspace_id,status,created_at desc);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_id uuid references public.runs(id),
  actor_id uuid references auth.users(id),
  actor_label text not null,
  action text not null,
  detail text not null,
  created_at timestamptz not null default now()
);
create index audit_workspace_time_idx on public.audit_events(workspace_id,created_at desc);

create table public.usage_records (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_start date not null,
  traced_runs integer not null default 0 check (traced_runs >= 0),
  primary key (workspace_id,period_start)
);
create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'free',
  plan text not null default 'developer' check (plan in ('developer','team','scale')),
  period_end timestamptz,
  last_stripe_event_created bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

create function private.is_member(wid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.workspace_id = wid and m.user_id = (select auth.uid()));
$$;
create function private.has_role(wid uuid, allowed text[]) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.workspace_id = wid and m.user_id = (select auth.uid()) and m.role = any(allowed));
$$;
revoke all on function private.is_member(uuid) from public;
revoke all on function private.has_role(uuid,text[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_role(uuid,text[]) to authenticated;

alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.agents enable row level security;
alter table public.runs enable row level security;
alter table public.run_events enable row level security;
alter table public.policies enable row level security;
alter table public.approvals enable row level security;
alter table public.audit_events enable row level security;
alter table public.usage_records enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.workspaces, public.memberships, public.agents, public.runs, public.run_events, public.policies, public.approvals, public.audit_events, public.usage_records, public.subscriptions to authenticated;

create policy workspace_read on public.workspaces for select to authenticated using (private.is_member(id));
create policy membership_read on public.memberships for select to authenticated using (private.is_member(workspace_id));
create policy agents_read on public.agents for select to authenticated using (private.is_member(workspace_id));
create policy runs_read on public.runs for select to authenticated using (private.is_member(workspace_id));
create policy events_read on public.run_events for select to authenticated using (private.is_member(workspace_id));
create policy policies_read on public.policies for select to authenticated using (private.is_member(workspace_id));
create policy approvals_read on public.approvals for select to authenticated using (private.is_member(workspace_id));
create policy audit_read on public.audit_events for select to authenticated using (private.is_member(workspace_id));
create policy usage_read on public.usage_records for select to authenticated using (private.is_member(workspace_id));
create policy subscriptions_read on public.subscriptions for select to authenticated using (private.is_member(workspace_id));

create function public.create_workspace(workspace_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare wid uuid; aid uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if char_length(trim(workspace_name)) not between 2 and 80 then raise exception 'Workspace name must have 2 to 80 characters'; end if;
  insert into public.workspaces(name,owner_id) values (trim(workspace_name),(select auth.uid())) returning id into wid;
  insert into public.memberships(workspace_id,user_id,role) values (wid,(select auth.uid()),'owner');
  insert into public.agents(workspace_id,name,environment) values (wid,'Support refund agent','development') returning id into aid;
  insert into public.policies(workspace_id,name,action_name) values (wid,'Refund amount guard','refund.simulate');
  insert into public.subscriptions(workspace_id) values (wid);
  insert into public.audit_events(workspace_id,actor_id,actor_label,action,detail) values (wid,(select auth.uid()),'Workspace owner','workspace.created','Workspace created');
  return wid;
end; $$;
revoke all on function public.create_workspace(text) from public;
grant execute on function public.create_workspace(text) to authenticated;

create function public.run_refund_demo(wid uuid, amount integer, customer text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid; aid uuid; verdict_value text; status_value text; explanation text; now_value timestamptz := now(); allow_limit integer; approval_limit integer; max_runs integer;
begin
  if not private.has_role(wid,array['owner','admin','member']) then raise exception 'Not authorized' using errcode='42501'; end if;
  if amount not between 1 and 1000000 then raise exception 'Invalid amount'; end if;
  if char_length(trim(customer)) not between 1 and 80 then raise exception 'Invalid customer label'; end if;
  select case when s.plan='team' and s.status in ('active','trialing') then 25000 else 1000 end into max_runs
    from public.subscriptions s where s.workspace_id=wid for update;
  if max_runs is null then raise exception 'Billing record unavailable'; end if;
  if coalesce((select u.traced_runs from public.usage_records u where u.workspace_id=wid and u.period_start=date_trunc('month',now())::date),0) >= max_runs
    then raise exception 'Monthly run limit reached'; end if;
  select p.allow_max_cents,p.approval_max_cents into allow_limit,approval_limit from public.policies p where p.workspace_id=wid and p.action_name='refund.simulate' and p.enabled=true;
  if allow_limit is null then raise exception 'Protected policy unavailable' using errcode='42501'; end if;
  select a.id into aid from public.agents a where a.workspace_id=wid order by a.created_at limit 1;
  if aid is null then raise exception 'No agent configured'; end if;
  if amount <= allow_limit then verdict_value := 'allow'; status_value := 'succeeded'; explanation := 'Amount is within the auto-approval limit.';
  elsif amount <= approval_limit then verdict_value := 'approval'; status_value := 'awaiting_approval'; explanation := 'Amount exceeds the auto-approval limit and requires review.';
  else verdict_value := 'block'; status_value := 'blocked'; explanation := 'Amount exceeds the hard maximum.'; end if;
  insert into public.runs(workspace_id,agent_id,status,customer_label,amount_cents,verdict,started_at,ended_at,input_tokens,output_tokens,cost_micros,cost_source)
  values (wid,aid,status_value,trim(customer),amount,verdict_value,now_value,case when verdict_value='approval' then null else now_value end,640,112,1700,'estimated') returning id into rid;
  insert into public.run_events(workspace_id,run_id,sequence,event_type,name,status,detail) values
    (wid,rid,1,'agent','support.refund','started','Fictional refund request received.'),
    (wid,rid,2,'model','intent.classify','succeeded','Fictional model step · 640 input / 112 output tokens · estimated cost.'),
    (wid,rid,3,'tool','order.lookup','succeeded','Fictional order lookup completed.'),
    (wid,rid,4,'policy','Refund amount guard',verdict_value,explanation);
  if verdict_value='allow' then
    insert into public.run_events(workspace_id,run_id,sequence,event_type,name,status,detail) values
      (wid,rid,5,'tool','refund.simulate','succeeded','Fictional refund simulated. No payment provider was contacted.'),
      (wid,rid,6,'agent','support.refund','succeeded','Run completed.');
  elsif verdict_value='approval' then
    insert into public.approvals(workspace_id,run_id) values (wid,rid);
    insert into public.run_events(workspace_id,run_id,sequence,event_type,name,status,detail) values (wid,rid,5,'approval','human.review','pending','Action paused before simulator invocation.');
  else
    insert into public.run_events(workspace_id,run_id,sequence,event_type,name,status,detail) values (wid,rid,5,'agent','support.refund','blocked','Action blocked before simulator invocation.');
  end if;
  insert into public.audit_events(workspace_id,run_id,actor_label,action,detail) values (wid,rid,'Aron policy engine','policy.'||verdict_value,explanation);
  insert into public.usage_records(workspace_id,period_start,traced_runs) values (wid,date_trunc('month',now_value)::date,1)
    on conflict (workspace_id,period_start) do update set traced_runs=public.usage_records.traced_runs+1;
  return rid;
end; $$;
revoke all on function public.run_refund_demo(uuid,integer,text) from public;
grant execute on function public.run_refund_demo(uuid,integer,text) to authenticated;

create function public.decide_refund_approval(approval_id uuid, decision text, decision_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare item public.approvals%rowtype; run_item public.runs%rowtype; next_seq integer;
begin
  if decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  if char_length(trim(decision_reason)) not between 3 and 500 then raise exception 'Reason must have 3 to 500 characters'; end if;
  select * into item from public.approvals where id=approval_id for update;
  if not found then raise exception 'Approval not found' using errcode='42501'; end if;
  if not private.has_role(item.workspace_id,array['owner','admin']) then raise exception 'Not authorized' using errcode='42501'; end if;
  if item.status <> 'pending' then raise exception 'Approval already decided'; end if;
  select * into run_item from public.runs where id=item.run_id for update;
  update public.approvals set status=decision,reason=trim(decision_reason),decided_by=(select auth.uid()),decided_at=now() where id=approval_id;
  select coalesce(max(sequence),0)+1 into next_seq from public.run_events where run_id=item.run_id;
  insert into public.run_events(workspace_id,run_id,sequence,event_type,name,status,detail) values
    (item.workspace_id,item.run_id,next_seq,'approval','human.review',decision,trim(decision_reason));
  if decision='approved' then
    insert into public.run_events(workspace_id,run_id,sequence,event_type,name,status,detail) values
      (item.workspace_id,item.run_id,next_seq+1,'tool','refund.simulate','succeeded','Fictional refund simulated after approval. No payment provider was contacted.'),
      (item.workspace_id,item.run_id,next_seq+2,'agent','support.refund','succeeded','Run completed after approval.');
    update public.runs set status='succeeded',ended_at=now(),duration_ms=(extract(epoch from now()-started_at)*1000)::integer where id=item.run_id;
  else
    update public.runs set status='rejected',ended_at=now(),duration_ms=(extract(epoch from now()-started_at)*1000)::integer where id=item.run_id;
  end if;
  insert into public.audit_events(workspace_id,run_id,actor_id,actor_label,action,detail)
    values (item.workspace_id,item.run_id,(select auth.uid()),'Workspace reviewer','approval.'||decision,trim(decision_reason));
  return item.run_id;
end; $$;
revoke all on function public.decide_refund_approval(uuid,text,text) from public;
grant execute on function public.decide_refund_approval(uuid,text,text) to authenticated;

-- Service-role-only billing transition. Event ID uniqueness makes retries idempotent.
create function public.apply_stripe_subscription_event(event_id text,event_type text,customer_id text,subscription_id text,price_id text,subscription_status text,period_end_value timestamptz,event_created bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare wid uuid;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  select workspace_id into wid from public.subscriptions where stripe_customer_id=customer_id for update;
  if wid is null then raise exception 'Unknown billing customer'; end if;
  insert into public.stripe_events(id,type) values (event_id,event_type) on conflict do nothing;
  if not found then return false; end if;
  if event_created < (select last_stripe_event_created from public.subscriptions where workspace_id=wid) then return false; end if;
  update public.subscriptions set stripe_subscription_id=subscription_id,stripe_price_id=price_id,status=subscription_status,
    plan=case when subscription_status in ('active','trialing') then 'team' else 'developer' end,
    period_end=period_end_value,last_stripe_event_created=event_created,updated_at=now() where workspace_id=wid;
  insert into public.audit_events(workspace_id,actor_label,action,detail) values (wid,'Stripe webhook','billing.'||event_type,'Subscription state synchronized');
  return true;
end; $$;
revoke all on function public.apply_stripe_subscription_event(text,text,text,text,text,text,timestamptz,bigint) from public,anon,authenticated;
grant execute on function public.apply_stripe_subscription_event(text,text,text,text,text,text,timestamptz,bigint) to service_role;

-- Agent tokens are stored only as SHA-256 digests. This RPC is callable only by the service role.
create function public.ingest_agent_run(agent_key_hash text,external_id text,run_status text,events jsonb,input_count integer,output_count integer,cost_in_micros bigint,cost_kind text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare aid uuid; wid uuid; rid uuid; event_item jsonb; event_index integer := 0; max_runs integer;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  select a.id,a.workspace_id into aid,wid from public.agents a where a.key_hash=agent_key_hash and a.key_revoked_at is null;
  if aid is null then raise exception 'Invalid agent key' using errcode='42501'; end if;
  if char_length(external_id) not between 1 and 120 or run_status not in ('succeeded','failed','blocked')
    or input_count not between 0 and 10000000 or output_count not between 0 and 10000000
    or cost_in_micros not between 0 and 1000000000 or cost_kind not in ('provider','estimated')
    or jsonb_typeof(events) <> 'array' or jsonb_array_length(events) not between 1 and 100
  then raise exception 'Invalid trace'; end if;
  select id into rid from public.runs where agent_id=aid and external_run_id=external_id;
  if rid is not null then return rid; end if;
  select case when s.plan='team' and s.status in ('active','trialing') then 25000 else 1000 end into max_runs
    from public.subscriptions s where s.workspace_id=wid for update;
  if coalesce((select traced_runs from public.usage_records where workspace_id=wid and period_start=date_trunc('month',now())::date),0) >= max_runs
  then raise exception 'Monthly run limit reached'; end if;
  insert into public.runs(workspace_id,agent_id,status,external_run_id,started_at,ended_at,input_tokens,output_tokens,cost_micros,cost_source)
    values(wid,aid,run_status,external_id,now(),now(),input_count,output_count,cost_in_micros,cost_kind) returning id into rid;
  for event_item in select value from jsonb_array_elements(events) loop
    event_index := event_index+1;
    if event_item->>'type' not in ('agent','model','tool','policy','approval','error')
      or char_length(coalesce(event_item->>'name','')) not between 1 and 120
      or char_length(coalesce(event_item->>'status','')) not between 1 and 40
      or char_length(coalesce(event_item->>'detail','')) > 500
    then raise exception 'Invalid event'; end if;
    insert into public.run_events(workspace_id,run_id,sequence,event_type,name,status,detail)
      values(wid,rid,event_index,event_item->>'type',event_item->>'name',event_item->>'status',coalesce(event_item->>'detail',''));
  end loop;
  insert into public.usage_records(workspace_id,period_start,traced_runs) values(wid,date_trunc('month',now())::date,1)
    on conflict (workspace_id,period_start) do update set traced_runs=public.usage_records.traced_runs+1;
  return rid;
end; $$;
revoke all on function public.ingest_agent_run(text,text,text,jsonb,integer,integer,bigint,text) from public,anon,authenticated;
grant execute on function public.ingest_agent_run(text,text,text,jsonb,integer,integer,bigint,text) to service_role;
