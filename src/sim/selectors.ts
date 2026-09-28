import { isWorker } from "../data/catalogs";
import type { AgentId, PolicyDecision, SimEvent, SimState } from "../types";

/** Read-only views for the UI. No mutation here. */

export type Health = "GATE READY" | "GATE OPEN" | "REVIEW" | "BLOCKED";

export function latestDecision(s: SimState, phase?: PolicyDecision["phase"]): PolicyDecision | undefined {
  for (let i = s.decisions.length - 1; i >= 0; i--) {
    const d = s.decisions[i];
    if (!phase || d.phase === phase) return d;
  }
  return undefined;
}

export function policyHealth(s: SimState): Health {
  const last = latestDecision(s);
  if (!last) return s.status === "blocked" ? "BLOCKED" : "GATE READY";
  if (last.verdict === "deny") return "BLOCKED";
  if (last.verdict === "ask") return "REVIEW";
  return "GATE OPEN";
}

/** Latest decision that touched a node. Policy and Control Plane see all. */
export function decisionFor(s: SimState, id: AgentId): PolicyDecision | undefined {
  if (!isWorker(id)) return latestDecision(s);
  for (let i = s.decisions.length - 1; i >= 0; i--) {
    const d = s.decisions[i];
    if (d.subject === id || d.taskOut?.targetAgent === id) return d;
  }
  return undefined;
}

export function eventsFor(s: SimState, id: AgentId, limit = 8): SimEvent[] {
  const matches = s.events.filter((e) => {
    if (e.actor === id) return true;
    if (id === "policy-agent") return e.kind === "policy" || e.kind === "dispatch";
    return isWorker(id) && e.kind === "dispatch" && e.text.startsWith(id);
  });
  return matches.slice(-limit);
}

export function lastConfidence(d: PolicyDecision | undefined): number | undefined {
  if (!d || d.results.length === 0) return undefined;
  return Math.min(...d.results.map((r) => r.confidence));
}

export function runSummary(s: SimState): { workers: number; denials: number } {
  return {
    workers: new Set(s.queue.filter((q) => q.status === "done").map((q) => q.agentId)).size,
    denials: s.decisions.filter((d) => d.verdict === "deny").length,
  };
}

export const fmtTime = (tick: number): string => {
  const m = Math.floor(tick / 60).toString().padStart(2, "0");
  const sec = (tick % 60).toString().padStart(2, "0");
  return `t+${m}:${sec}`;
};
