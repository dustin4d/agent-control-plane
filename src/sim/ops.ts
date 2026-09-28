import type { ActionItem, AgentId, PolicyTaskJson, SimEvent, SimState, WorkerId } from "../types";
import { NO_TOOLS } from "./fixtures";
import { nextId } from "./ids";
import { askJev, boundsViolation, checkBounds, type JevFixture } from "./jev";

/** Script helpers. Each mutates a draft state inside one scripted step. */

export function log(s: SimState, actor: SimEvent["actor"], kind: SimEvent["kind"], text: string): void {
  s.events.push({ id: nextId("ev"), t: s.tick, actor, kind, text });
}

export function block(s: SimState): void {
  s.status = "blocked";
  s.activeEdge = undefined;
  s.agents["policy-agent"].status = "error";
}

export function receive(s: SimState): void {
  const cp = s.agents["control-plane"];
  cp.status = "done";
  cp.snippet = "task accepted\nforwarded to Head Agent";
  s.agents["head-agent"].status = "working";
  s.agents["head-agent"].snippet = "reading task";
  s.activeEdge = "cp-head";
  log(s, "control-plane", "task", `received task ${s.submitted?.id ?? ""}`);
}

export function plan(s: SimState, bullet: string, risk?: SimState["planRisk"]): void {
  const head = s.agents["head-agent"];
  s.plan.push(bullet);
  if (risk) s.planRisk = risk;
  head.status = "working";
  head.snippet = `plan ${s.plan.length}: ${bullet}`;
  log(s, "head-agent", "plan", bullet);
}

export function toPolicy(s: SimState): void {
  const head = s.agents["head-agent"];
  head.status = "done";
  head.snippet = `${s.plan.length}-step plan sent\nWaiting on Policy`;
  const policy = s.agents["policy-agent"];
  policy.status = "working";
  policy.snippet = "Ingress check\nasking Jev";
  s.activeEdge = "head-policy";
  log(s, "head-agent", "plan", "plan sent to Policy");
}

/** Build the Policy JSON a worker will see. Worker bounds cap the fixture. */
function buildTask(s: SimState, fx: Omit<PolicyTaskJson, "id">): PolicyTaskJson {
  const bounds = s.agents[fx.targetAgent];
  return {
    id: nextId("pt"),
    ...fx,
    constraints: [...fx.constraints],
    allowedTools: fx.allowedTools.filter((t) => bounds.tools.includes(t)),
    allowedPaths: fx.allowedPaths.filter((p) => bounds.paths.includes(p)),
    stepBudget: Math.min(fx.stepBudget, bounds.stepLimit),
  };
}

function decide(
  s: SimState,
  phase: "ingress" | "egress",
  subject: AgentId,
  jev: JevFixture,
  extra: { taskIn?: string; taskOut?: PolicyTaskJson; actionsIn?: SimState["actions"][WorkerId] },
): void {
  s.decisions.push({ id: nextId("pd"), t: s.tick, phase, subject, ...jev, ...extra });
  const policy = s.agents["policy-agent"];
  policy.snippet = `${phase} ${jev.verdict}\n${jev.reason}`;
  log(s, "policy-agent", "policy", `${jev.verdict}  ${jev.reason}`);
}

export function ingress(
  s: SimState,
  fixture: JevFixture,
  task?: Omit<PolicyTaskJson, "id">,
  queue: { agentId: WorkerId; label: string }[] = [],
): void {
  const jev = askJev(fixture);
  const taskOut = jev.verdict === "allow" || jev.verdict === "rewrite" ? task && buildTask(s, task) : undefined;
  decide(s, "ingress", taskOut?.targetAgent ?? "policy-agent", jev, { taskIn: s.submitted?.rawText ?? "", taskOut });
  if (!taskOut) {
    block(s);
    return;
  }
  s.agents["policy-agent"].status = "waiting-policy";
  s.taskJson[taskOut.targetAgent] = taskOut;
  s.queue = queue.map((q) => ({ ...q, status: "queued" }));
  for (const q of queue) s.agents[q.agentId].status = "queued";
}

export function dispatch(s: SimState, id: WorkerId): void {
  const worker = s.agents[id];
  const task = s.taskJson[id];
  if (!task || worker.tools.length === 0) {
    decide(s, "egress", id, askJev(NO_TOOLS), {});
    worker.status = "error";
    worker.snippet = "not dispatched\nno tools in bounds";
    block(s);
    return;
  }
  s.activeWorker = id;
  s.activeEdge = "policy-stack";
  worker.status = "working";
  worker.snippet = `task ${task.id}\n${task.goal}`;
  s.actions[id] = { taskId: task.id, agentId: id, startedAt: s.tick, actions: [], claimedDone: false, artifacts: [] };
  setQueue(s, id, "working");
  log(s, "policy-agent", "dispatch", `${id} <- ${task.id} (Workers see JSON only)`);
}

interface ActInput {
  kind: ActionItem["kind"];
  tool: string;
  path?: string;
  summary: string;
  detail: string;
  snippet: string;
}

export function act(s: SimState, id: WorkerId, a: ActInput): void {
  const worker = s.agents[id];
  const doc = s.actions[id];
  if (!doc) return;
  const item: ActionItem = { id: nextId("act"), t: s.tick, agentId: id, kind: a.kind, summary: a.summary, detail: a.detail, tool: a.tool };
  if (a.path) item.path = a.path;
  doc.actions.push(item);
  worker.stepsUsed += 1;
  worker.snippet = a.snippet;
  if (a.path) worker.lastFile = a.path;
  if (a.kind === "cmd" || a.kind === "test") worker.lastCommand = a.detail;
  s.activeEdge = "policy-stack";
  log(s, id, "action", a.summary);
}

export function returnActions(s: SimState, id: WorkerId, artifacts: string[]): void {
  const doc = s.actions[id];
  if (!doc) return;
  doc.claimedDone = true;
  doc.finishedAt = s.tick;
  doc.artifacts = artifacts;
  const worker = s.agents[id];
  worker.status = "waiting-policy";
  worker.snippet = `ACTIONS.JSON returned\n${doc.actions.length} actions, Waiting on Policy`;
  s.agents["policy-agent"].status = "working";
  s.agents["policy-agent"].snippet = "Egress check\nasking Jev";
  s.activeEdge = "stack-policy";
  setQueue(s, id, "waiting-policy");
  log(s, id, "actions-json", `ACTIONS.JSON returned (${doc.actions.length} actions)`);
}

export function egress(s: SimState, id: WorkerId, fixture: JevFixture, next?: Omit<PolicyTaskJson, "id">): void {
  const doc = s.actions[id];
  const task = s.taskJson[id];
  if (!doc || !task) return;
  const issues = checkBounds(doc, task);
  const jev = issues.length > 0 ? boundsViolation(issues) : askJev(fixture);
  const pass = jev.verdict === "allow" || jev.verdict === "rewrite";
  const taskOut = pass && next ? buildTask(s, next) : undefined;
  decide(s, "egress", id, jev, {
    taskIn: JSON.stringify(task, null, 2),
    taskOut,
    actionsIn: structuredClone(doc),
  });
  s.reviewed.push(id);
  s.activeWorker = undefined;
  const worker = s.agents[id];
  if (!pass) {
    worker.status = jev.verdict === "deny" ? "error" : "waiting-policy";
    setQueue(s, id, worker.status);
    block(s);
    if (jev.verdict === "ask") s.agents["policy-agent"].status = "waiting-policy";
    return;
  }
  worker.status = "done";
  setQueue(s, id, "done");
  s.agents["policy-agent"].status = "waiting-policy";
  if (taskOut) s.taskJson[taskOut.targetAgent] = taskOut;
}

export function complete(s: SimState): void {
  s.status = "complete";
  s.activeEdge = undefined;
  s.agents["policy-agent"].status = "done";
  s.agents["control-plane"].snippet = "run complete";
  log(s, "system", "ui", "run complete");
}

function setQueue(s: SimState, id: WorkerId, status: SimState["queue"][number]["status"]): void {
  for (const q of s.queue) if (q.agentId === id) q.status = status;
}
