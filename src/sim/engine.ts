import { DEFAULT_WORKFLOW, initialAgents } from "../data/catalogs";
import type { ScenarioId, SimState } from "../types";
import { OPERATOR_KILL } from "./fixtures";
import { nextId } from "./ids";
import { askJev } from "./jev";
import { block } from "./ops";
import { SCENARIOS } from "./scenarios";

/**
 * Pure state machine. Every function returns a new state and never touches
 * the previous one. Only the store's single interval calls tick().
 */

export function initialState(scenarioId: ScenarioId): SimState {
  return {
    scenarioId,
    tick: 0,
    cursor: 0,
    status: "idle",
    agents: initialAgents(DEFAULT_WORKFLOW),
    decisions: [],
    taskJson: {},
    actions: {},
    queue: [],
    questions: [],
  };
}

export function submit(s: SimState, rawText: string): SimState {
  const text = rawText.trim();
  if (!text || s.status !== "idle") return s;
  const next = structuredClone(s);
  next.submitted = { id: nextId("task"), rawText: text, createdAt: s.tick };
  next.status = "running";
  next.agents["control-plane"].status = "working";
  return next;
}

export function tick(s: SimState): SimState {
  if (s.status !== "running") return s;
  const draft = structuredClone(s);
  draft.tick += 1;
  const script = SCENARIOS[draft.scenarioId].script;
  while (draft.status === "running" && script[draft.cursor] && script[draft.cursor].atTick <= draft.tick) {
    const step = script[draft.cursor];
    draft.cursor += 1;
    step.apply(draft);
  }
  return draft;
}

/** Record the user's choice for a waiting worker and resume the run. */
export function answer(s: SimState, questionId: string, optionId: string): SimState {
  if (s.status !== "waiting-user") return s;
  const q = s.questions.find((x) => x.id === questionId);
  if (!q || q.answer || !q.options.some((o) => o.id === optionId)) return s;
  const draft = structuredClone(s);
  const dq = draft.questions.find((x) => x.id === questionId);
  if (!dq) return s;
  dq.answer = optionId;
  draft.agents[dq.agentId].status = "working";
  for (const item of draft.queue) if (item.agentId === dq.agentId) item.status = "working";
  draft.agents[dq.agentId].snippet = `Continuing: ${dq.options.find((o) => o.id === optionId)?.label ?? optionId}`;
  draft.status = "running";
  return draft;
}

export function stop(s: SimState): SimState {
  if (s.status !== "running" && s.status !== "waiting-user") return s;
  const draft = structuredClone(s);
  const active = draft.activeWorker;
  const jev = askJev(OPERATOR_KILL);
  if (active) {
    draft.agents[active].status = "error";
    for (const q of draft.queue) if (q.agentId === active) q.status = "error";
  }
  draft.decisions.push({ id: nextId("pd"), t: draft.tick, phase: "egress", subject: active ?? "policy-agent", ...jev });
  block(draft);
  return draft;
}
