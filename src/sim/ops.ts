import type { ActionItem, ChoiceOption, PolicyDecision, PolicyTaskJson, SimState, UserTaskJson, WorkerId } from "../types";
import { NO_TOOLS } from "./fixtures";
import { nextId } from "./ids";
import { askJev, boundsViolation, checkBounds, type JevFixture } from "./jev";

/** Script helpers. Each mutates a draft state inside one scripted step. */

export function block(s: SimState): void {
  s.status = "blocked";
  s.agents["policy-agent"].status = "error";
}

export function receive(s: SimState): void {
  s.agents["control-plane"].status = "done";
  const ua = s.agents["user-agent"];
  ua.status = "working";
  ua.snippet = "Parsing instructions";
}

/** User Agent turns plain language into policy-compatible JSON. */
export function parse(s: SimState, json: UserTaskJson): void {
  s.parsed = structuredClone(json);
  const ua = s.agents["user-agent"];
  ua.status = "working";
  ua.snippet = `Parsed: ${json.goal}`;
}

export function toPolicy(s: SimState): void {
  const ua = s.agents["user-agent"];
  ua.status = "done";
  ua.snippet = "JSON sent to Policy";
  const policy = s.agents["policy-agent"];
  policy.status = "working";
  policy.snippet = "Ingress check";
}

/** Build the Policy JSON a worker will see. Worker bounds cap the fixture. */
function buildTask(s: SimState, fx: UserTaskJson): PolicyTaskJson {
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

function decide(s: SimState, d: Omit<PolicyDecision, "id" | "t" | keyof JevFixture>, jev: JevFixture): void {
  s.decisions.push({ id: nextId("pd"), t: s.tick, ...d, ...jev });
  s.agents["policy-agent"].snippet = `${d.phase} ${jev.verdict}`;
}

export function ingress(
  s: SimState,
  fixture: JevFixture,
  task?: UserTaskJson,
  queue: { agentId: WorkerId; label: string }[] = [],
): void {
  const jev = askJev(fixture);
  const pass = jev.verdict === "allow" || jev.verdict === "rewrite";
  const taskOut = pass && task ? buildTask(s, task) : undefined;
  decide(s, { phase: "ingress", subject: taskOut?.targetAgent ?? "policy-agent", taskIn: s.parsed, taskOut }, jev);
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
    decide(s, { phase: "egress", subject: id }, askJev(NO_TOOLS));
    worker.status = "error";
    setQueue(s, id, "error");
    block(s);
    return;
  }
  s.activeWorker = id;
  worker.status = "working";
  worker.snippet = `Started ${task.id}`;
  s.actions[id] = { taskId: task.id, agentId: id, startedAt: s.tick, actions: [], claimedDone: false, artifacts: [] };
  setQueue(s, id, "working");
}

interface ActInput {
  kind: ActionItem["kind"];
  tool: string;
  path?: string;
  summary: string;
  detail: string;
}

export function act(s: SimState, id: WorkerId, a: ActInput): void {
  const doc = s.actions[id];
  if (!doc) return;
  const item: ActionItem = { id: nextId("act"), t: s.tick, agentId: id, kind: a.kind, summary: a.summary, detail: a.detail, tool: a.tool };
  if (a.path) item.path = a.path;
  doc.actions.push(item);
  s.agents[id].stepsUsed += 1;
  s.agents[id].snippet = a.summary;
}

/** Worker cannot continue without a choice from the user. Holds the run until answered. */
export function ask(s: SimState, id: WorkerId, prompt: string, options: ChoiceOption[]): void {
  s.questions.push({ id: nextId("q"), t: s.tick, agentId: id, prompt, options: structuredClone(options) });
  s.agents[id].status = "waiting-user";
  s.agents[id].snippet = "Waiting on your decision";
  setQueue(s, id, "waiting-user");
  s.status = "waiting-user";
}

/** Answer to the latest question this worker asked. */
export function answerOf(s: SimState, id: WorkerId): string | undefined {
  for (let i = s.questions.length - 1; i >= 0; i--) if (s.questions[i].agentId === id) return s.questions[i].answer;
  return undefined;
}

export function note(s: SimState, id: WorkerId, text: string): void {
  s.agents[id].snippet = text;
}

export function returnActions(s: SimState, id: WorkerId, artifacts: string[]): void {
  const doc = s.actions[id];
  if (!doc) return;
  doc.claimedDone = true;
  doc.finishedAt = s.tick;
  doc.artifacts = artifacts;
  s.agents[id].status = "waiting-policy";
  s.agents[id].snippet = `Returned ACTIONS.JSON (${doc.actions.length} actions)`;
  s.agents["policy-agent"].status = "working";
  s.agents["policy-agent"].snippet = "Egress check";
  setQueue(s, id, "waiting-policy");
}

export function egress(s: SimState, id: WorkerId, fixture: JevFixture, next?: UserTaskJson): void {
  const doc = s.actions[id];
  const task = s.taskJson[id];
  if (!doc || !task) return;
  const issues = checkBounds(doc, task);
  const jev = issues.length > 0 ? boundsViolation(issues) : askJev(fixture);
  const pass = jev.verdict === "allow" || jev.verdict === "rewrite";
  const taskOut = pass && next ? buildTask(s, next) : undefined;
  decide(s, { phase: "egress", subject: id, taskOut, actionsIn: structuredClone(doc) }, jev);
  s.activeWorker = undefined;
  const worker = s.agents[id];
  if (!pass) {
    worker.status = jev.verdict === "deny" ? "error" : "waiting-policy";
    setQueue(s, id, worker.status);
    block(s);
    return;
  }
  worker.status = "done";
  worker.snippet = "Reviewed by Policy";
  setQueue(s, id, "done");
  s.agents["policy-agent"].status = "waiting-policy";
  if (taskOut) s.taskJson[taskOut.targetAgent] = taskOut;
}

export function complete(s: SimState): void {
  s.status = "complete";
  s.agents["policy-agent"].status = "done";
}

function setQueue(s: SimState, id: WorkerId, status: SimState["queue"][number]["status"]): void {
  for (const q of s.queue) if (q.agentId === id) q.status = status;
}
