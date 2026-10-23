import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDemoStore, createDemoRun, decideApproval, getDemoState } from '../lib/demo-store.ts';

test('the simulator is gated until an approval and never runs for blocked or rejected actions', () => {
  const original = process.cwd();
  const temp = mkdtempSync(join(tmpdir(), 'aron-flow-'));
  process.chdir(temp);
  try {
    const safe = createDemoRun(2499);
    const pending = createDemoRun(24000);
    const blocked = createDemoRun(50001);
    let state = getDemoState();
    const names = (id: string) => state.events.filter(e => e.run_id === id).map(e => e.name);
    assert.ok(names(safe).includes('refund.simulate'));
    assert.ok(!names(pending).includes('refund.simulate'));
    assert.ok(!names(blocked).includes('refund.simulate'));
    const approval = state.approvals.find(a => a.run_id === pending)!;
    decideApproval(approval.id, 'approved', 'Fictional order reviewed');
    state = getDemoState();
    assert.deepEqual(names(pending).slice(-3), ['human.review', 'refund.simulate', 'support.refund']);
    assert.equal(state.approvals.find(a => a.id === approval.id)?.status, 'approved');
    assert.throws(() => decideApproval(approval.id, 'approved', 'Again'), /already decided/);

    const rejected = createDemoRun(24000);
    state = getDemoState();
    decideApproval(state.approvals.find(a => a.run_id === rejected)!.id, 'rejected', 'Needs more review');
    state = getDemoState();
    assert.ok(!names(rejected).includes('refund.simulate'));
    assert.equal(state.runs.find(r => r.id === rejected)?.status, 'rejected');
  } finally {
    closeDemoStore();
    process.chdir(original);
    rmSync(temp, { recursive: true, force: true });
  }
});
