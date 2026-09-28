import type { PolicyDecision, SimState } from "../types";

/** Read-only views for the UI. No mutation here. */

export interface PolicyWarning {
  decision: PolicyDecision;
  /** What Policy changed between the User Agent JSON and the JSON it sent on. */
  changes: string[];
}

const list = (xs: string[]) => (xs.length ? xs.join(", ") : "none");

function diff(d: PolicyDecision): string[] {
  const a = d.taskIn;
  const b = d.taskOut;
  if (!a || !b) return [];
  const out: string[] = [];
  if (a.goal !== b.goal) out.push(`goal → ${b.goal}`);
  const droppedTools = a.allowedTools.filter((t) => !b.allowedTools.includes(t));
  if (droppedTools.length) out.push(`tools removed: ${list(droppedTools)}`);
  if (list(a.allowedPaths) !== list(b.allowedPaths)) out.push(`paths ${list(a.allowedPaths)} → ${list(b.allowedPaths)}`);
  if (a.stepBudget !== b.stepBudget) out.push(`step budget ${a.stepBudget} → ${b.stepBudget}`);
  const added = b.constraints.filter((c) => !a.constraints.includes(c));
  for (const c of added) out.push(`constraint added: ${c}`);
  if (a.targetAgent !== b.targetAgent) out.push(`routed to ${b.targetAgent}`);
  return out;
}

/** Every Policy decision that was not a plain allow. */
export function policyWarnings(s: SimState): PolicyWarning[] {
  return s.decisions.filter((d) => d.verdict !== "allow").map((decision) => ({ decision, changes: diff(decision) }));
}

export function runSummary(s: SimState): { workers: number; decisions: number } {
  return {
    workers: s.queue.filter((q) => q.status === "done").length,
    decisions: s.questions.filter((q) => q.answer).length,
  };
}
