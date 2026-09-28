import type { ActionsJson, JevQuestion, JevResult, PolicyTaskJson, Verdict } from "../types";

/**
 * Mock Jev. Never calls a model: each decision comes from a fixture.
 * Code owns the option list and the hard bounds checks below.
 */
export const JEV_HELP =
  "Jev does not write tasks. Code owns the option list. Jev picks allow, rewrite, ask, or deny. Hard denies stay in code.";

export const VERDICT_OPTIONS: Verdict[] = ["allow", "rewrite", "ask", "deny"];

export interface JevFixture {
  verdict: Verdict;
  reason: string;
  questions: JevQuestion[];
  results: JevResult[];
}

export function askJev(fixture: JevFixture): JevFixture {
  return {
    verdict: fixture.verdict,
    reason: fixture.reason,
    questions: fixture.questions.map((q) => ({ ...q, options: q.options ? [...q.options] : undefined })),
    results: fixture.results.map((r) => ({ ...r })),
  };
}

const pathAllowed = (path: string, allowed: string[]): boolean =>
  allowed.some((a) => (a.endsWith("/") ? path.startsWith(a) : path === a || path.startsWith(`${a}/`)));

/** Code-owned egress check. Returns every bound the worker broke. */
export function checkBounds(actions: ActionsJson, task: PolicyTaskJson): string[] {
  const issues: string[] = [];
  for (const a of actions.actions) {
    if (!task.allowedTools.includes(a.tool)) issues.push(`tool "${a.tool}" not in allowedTools`);
    if (a.path && !pathAllowed(a.path, task.allowedPaths)) issues.push(`path "${a.path}" outside allowedPaths`);
  }
  if (actions.actions.length > task.stepBudget) {
    issues.push(`used ${actions.actions.length} steps, budget ${task.stepBudget}`);
  }
  return [...new Set(issues)];
}

/** Egress verdict when code finds a bounds violation. Overrides the fixture. */
export function boundsViolation(issues: string[]): JevFixture {
  return {
    verdict: "ask",
    reason: `Bounds check failed: ${issues.join("; ")}. Needs operator review.`,
    questions: [
      { id: "route", type: "choice", prompt: "route", options: [...VERDICT_OPTIONS] },
      { id: "in-bounds", type: "noul", prompt: "actions within bounds" },
    ],
    results: [
      { questionId: "route", answer: "ask", confidence: 0.93 },
      { questionId: "in-bounds", answer: "false", confidence: 0.99 },
    ],
  };
}
