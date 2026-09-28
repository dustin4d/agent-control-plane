import { initialAgents } from "../data/catalogs";
import type { ScenarioId, SimState, WorkerId, WorkflowEdit } from "../types";
import { OPERATOR_KILL } from "./fixtures";
import { nextId } from "./ids";
import { askJev } from "./jev";
import { block, log } from "./ops";
import { SCENARIOS } from "./scenarios";

/**
 * Pure state machine. Every function returns a new state and never touches
 * the previous one. Only the store's single interval calls tick().
 */

export function initialState(
  scenarioId: ScenarioId,
  workflow: Record<WorkerId, WorkflowEdit>,
  inputHistory: SimState["inputHistory"] = [],
): SimState {
  return {
    scenarioId,
    tick: 0,
    cursor: 0,
    status: "idle",
    inputHistory,
    plan: [],
    agents: initialAgents(workflow),
    decisions: [],
    taskJson: {},
    actions: {},
    reviewed: [],
    queue: [],
    events: [],
  };
}

export function reset(s: SimState, workflow: Record<WorkerId, WorkflowEdit>): SimState {
  return initialState(s.scenarioId, workflow, s.inputHistory);
}

export function submit(s: SimState, rawText: string, status: "running" | "paused" = "running"): SimState {
  const text = rawText.trim();
  if (!text || s.status !== "idle") return s;
  const input = { id: nextId("task"), rawText: text, createdAt: s.tick };
  const next = structuredClone(s);
  next.submitted = input;
  next.inputHistory = [...s.inputHistory, input];
  next.status = status;
  next.agents["control-plane"].status = "working";
  next.agents["control-plane"].snippet = "task submitted";
  log(next, "control-plane", "ui", `Send to Head Agent: ${input.id}`);
  return next;
}

function applyNext(draft: SimState): void {
  const step = SCENARIOS[draft.scenarioId].script[draft.cursor];
  if (!step) return;
  draft.cursor += 1;
  step.apply(draft);
}

export function tick(s: SimState): SimState {
  if (s.status !== "running") return s;
  const draft = structuredClone(s);
  draft.tick += 1;
  const script = SCENARIOS[draft.scenarioId].script;
  while (draft.status === "running" && script[draft.cursor] && script[draft.cursor].atTick <= draft.tick) {
    applyNext(draft);
  }
  return draft;
}

/** Run exactly one scheduled event, then hold in paused. */
export function step(s: SimState): SimState {
  if (s.status !== "running" && s.status !== "paused") return s;
  const next = SCENARIOS[s.scenarioId].script[s.cursor];
  if (!next) return s;
  const draft = structuredClone(s);
  draft.tick = Math.max(draft.tick + 1, next.atTick);
  applyNext(draft);
  if (draft.status === "running") draft.status = "paused";
  return draft;
}

export function setPaused(s: SimState, paused: boolean): SimState {
  if (paused && s.status === "running") return { ...s, status: "paused" };
  if (!paused && s.status === "paused") return { ...s, status: "running" };
  return s;
}

export function kill(s: SimState): SimState {
  if (s.status !== "running" && s.status !== "paused") return s;
  const draft = structuredClone(s);
  const active = draft.activeWorker;
  const jev = askJev(OPERATOR_KILL);
  if (active) {
    draft.agents[active].status = "error";
    for (const q of draft.queue) if (q.agentId === active) q.status = "error";
    const doc = draft.actions[active];
    if (doc) draft.reviewed.push(active);
    draft.decisions.push({
      id: nextId("pd"),
      t: draft.tick,
      phase: "egress",
      subject: active,
      ...jev,
      taskIn: JSON.stringify(draft.taskJson[active] ?? {}, null, 2),
      actionsIn: doc ? structuredClone(doc) : undefined,
    });
  } else {
    draft.decisions.push({ id: nextId("pd"), t: draft.tick, phase: "egress", subject: "policy-agent", ...jev });
  }
  draft.agents["policy-agent"].snippet = "egress deny\noperator kill";
  log(draft, "policy-agent", "policy", `deny  operator kill${active ? ` (${active})` : ""}`);
  block(draft);
  return draft;
}
