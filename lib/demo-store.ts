import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { evaluateRefund, type Verdict } from './policy.ts';

export type Run = { id: string; customer: string; amount_cents: number; status: string; verdict: Verdict; started_at: string; duration_ms: number | null; estimated_cost_micros: number; source_run_id: string | null };
export type RunEvent = { id: string; run_id: string; sequence: number; type: string; name: string; status: string; detail: string; created_at: string };
export type Approval = { id: string; run_id: string; status: string; reason: string | null; decided_by: string | null; decided_at: string | null; created_at: string };
export type AuditEvent = { id: string; run_id: string; action: string; actor: string; detail: string; created_at: string };

let db: DatabaseSync | undefined;
export function closeDemoStore() { db?.close(); db = undefined; }
function database() {
  if (db) return db;
  const dir = join(process.cwd(), 'data');
  mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(join(dir, 'aron-demo.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, customer TEXT NOT NULL, amount_cents INTEGER NOT NULL, status TEXT NOT NULL, verdict TEXT NOT NULL, started_at TEXT NOT NULL, duration_ms INTEGER, estimated_cost_micros INTEGER NOT NULL, source_run_id TEXT);
    CREATE TABLE IF NOT EXISTS run_events (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), sequence INTEGER NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(run_id,sequence));
    CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), status TEXT NOT NULL, reason TEXT, decided_by TEXT, decided_at TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id), action TEXT NOT NULL, actor TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);`);
  return db;
}

function event(conn: DatabaseSync, runId: string, sequence: number, type: string, name: string, status: string, detail: string) {
  conn.prepare('INSERT INTO run_events VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(), runId, sequence, type, name, status, detail, new Date().toISOString());
}
function audit(conn: DatabaseSync, runId: string, action: string, actor: string, detail: string) {
  conn.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?,?)').run(randomUUID(), runId, action, actor, detail, new Date().toISOString());
}

/** The only action adapter in demo mode. Its effect is an event, never a payment request. */
function simulateRefund(conn: DatabaseSync, runId: string, sequence: number, amountCents: number) {
  event(conn, runId, sequence, 'tool', 'refund.simulate', 'succeeded', `Fictional refund of $${(amountCents / 100).toFixed(2)} simulated. No payment was sent.`);
}

export function createDemoRun(amountCents: number, customer = 'Maya Chen', sourceRunId: string | null = null) {
  const decision = evaluateRefund(amountCents);
  const conn = database();
  const id = randomUUID();
  const now = new Date().toISOString();
  const status = decision.verdict === 'allow' ? 'succeeded' : decision.verdict === 'approval' ? 'awaiting_approval' : 'blocked';
  conn.exec('BEGIN IMMEDIATE');
  try {
    conn.prepare('INSERT INTO runs VALUES (?,?,?,?,?,?,?,?,?)').run(id, customer, amountCents, status, decision.verdict, now, decision.verdict === 'allow' ? 1240 : null, 1700, sourceRunId);
    event(conn, id, 1, 'agent', 'support.refund', 'started', 'Fictional customer requested a refund.');
    event(conn, id, 2, 'model', 'intent.classify', 'succeeded', 'Refund intent identified · 640 input / 112 output tokens · cost estimated.');
    event(conn, id, 3, 'tool', 'order.lookup', 'succeeded', `Fictional order found for ${customer}.`);
    event(conn, id, 4, 'policy', decision.rule, decision.verdict, decision.reason);
    if (decision.verdict === 'allow') {
      simulateRefund(conn, id, 5, amountCents);
      event(conn, id, 6, 'agent', 'support.refund', 'succeeded', 'Run completed.');
      audit(conn, id, 'refund.simulated', 'Aron policy engine', 'Action passed policy and the fictional simulator ran.');
    } else if (decision.verdict === 'approval') {
      conn.prepare('INSERT INTO approvals VALUES (?,?,?,?,?,?,?)').run(randomUUID(), id, 'pending', null, null, null, now);
      event(conn, id, 5, 'approval', 'human.review', 'pending', 'Action paused. The simulator has not run.');
      audit(conn, id, 'approval.requested', 'Aron policy engine', decision.reason);
    } else {
      event(conn, id, 5, 'agent', 'support.refund', 'blocked', 'Action stopped. The simulator has not run.');
      audit(conn, id, 'refund.blocked', 'Aron policy engine', decision.reason);
    }
    conn.exec('COMMIT');
  } catch (error) { conn.exec('ROLLBACK'); throw error; }
  return id;
}

export function getDemoState() {
  const conn = database();
  const count = (conn.prepare('SELECT count(*) as count FROM runs').get() as { count: number }).count;
  if (!count) {
    createDemoRun(2499, 'Maya Chen');
    createDemoRun(24000, 'Jordan Lee');
    createDemoRun(62000, 'Alex Rivera');
  }
  return {
    runs: conn.prepare('SELECT * FROM runs ORDER BY started_at DESC, rowid DESC').all() as Run[],
    events: conn.prepare('SELECT * FROM run_events ORDER BY sequence').all() as RunEvent[],
    approvals: conn.prepare('SELECT * FROM approvals ORDER BY created_at DESC').all() as Approval[],
    audit: conn.prepare('SELECT * FROM audit_events ORDER BY created_at DESC').all() as AuditEvent[],
  };
}

export function decideApproval(id: string, choice: 'approved' | 'rejected', reason: string) {
  const conn = database();
  conn.exec('BEGIN IMMEDIATE');
  try {
    const approval = conn.prepare('SELECT * FROM approvals WHERE id=?').get(id) as Approval | undefined;
    if (!approval) throw new Error('Approval not found');
    if (approval.status !== 'pending') throw new Error('Approval already decided');
    const run = conn.prepare('SELECT * FROM runs WHERE id=?').get(approval.run_id) as Run;
    const now = new Date().toISOString();
    const actor = 'Demo operator';
    conn.prepare('UPDATE approvals SET status=?, reason=?, decided_by=?, decided_at=? WHERE id=?').run(choice, reason, actor, now, id);
    const nextSeq = (conn.prepare('SELECT max(sequence) as n FROM run_events WHERE run_id=?').get(run.id) as { n: number }).n + 1;
    event(conn, run.id, nextSeq, 'approval', 'human.review', choice, `${actor}: ${reason}`);
    if (choice === 'approved') {
      simulateRefund(conn, run.id, nextSeq + 1, run.amount_cents);
      event(conn, run.id, nextSeq + 2, 'agent', 'support.refund', 'succeeded', 'Run completed after approval.');
      conn.prepare('UPDATE runs SET status=?, duration_ms=? WHERE id=?').run('succeeded', Date.now() - Date.parse(run.started_at), run.id);
    } else {
      conn.prepare('UPDATE runs SET status=?, duration_ms=? WHERE id=?').run('rejected', Date.now() - Date.parse(run.started_at), run.id);
    }
    audit(conn, run.id, `approval.${choice}`, actor, reason);
    conn.exec('COMMIT');
  } catch (error) { conn.exec('ROLLBACK'); throw error; }
}
