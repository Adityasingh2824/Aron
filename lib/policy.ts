export type Verdict = 'allow' | 'approval' | 'block';
export type PolicyDecision = { verdict: Verdict; reason: string; rule: string };

/** Money enters this boundary as integer cents. No model response influences the verdict. */
export function evaluateRefund(amountCents: number): PolicyDecision {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Amount must be a positive integer number of cents');
  if (amountCents <= 5000) return { verdict: 'allow', reason: 'Refund is at or below the $50 auto-approval limit.', rule: 'Refund policy · v1' };
  if (amountCents <= 50000) return { verdict: 'approval', reason: 'Refund exceeds $50 and needs a human decision before execution.', rule: 'Refund policy · v1' };
  return { verdict: 'block', reason: 'Refund exceeds the $500 maximum and cannot be executed.', rule: 'Refund policy · v1' };
}
