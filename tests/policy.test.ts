import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRefund } from '../lib/policy.ts';

test('refund thresholds are deterministic at the boundaries', () => {
  assert.equal(evaluateRefund(2499).verdict, 'allow');
  assert.equal(evaluateRefund(5000).verdict, 'allow');
  assert.equal(evaluateRefund(5001).verdict, 'approval');
  assert.equal(evaluateRefund(24000).verdict, 'approval');
  assert.equal(evaluateRefund(50000).verdict, 'approval');
  assert.equal(evaluateRefund(50001).verdict, 'block');
  assert.throws(() => evaluateRefund(0));
  assert.throws(() => evaluateRefund(20.5));
});
