export type AgentId =
  | "control-plane"
  | "head-agent"
  | "policy-agent"
  | "model-agent"
  | "dev-agent"
  | "os-agent";

export type WorkerId = Exclude<AgentId, "control-plane" | "head-agent" | "policy-agent">;

export type Verdict = "allow" | "rewrite" | "ask" | "deny";
export type RunStatus = "idle" | "running" | "paused" | "complete" | "blocked";
export type AgentStatus = "idle" | "queued" | "working" | "waiting-policy" | "done" | "error";

export interface TaskInput {
  id: string;
  rawText: string;
  createdAt: number;
}

export interface PolicyTaskJson {
  id: string;
  goal: string;
  constraints: string[];
  allowedTools: string[];
  allowedPaths: string[];
  stepBudget: number;
  targetAgent: WorkerId;
  risk: "low" | "medium" | "high";
}

export interface JevQuestion {
  id: string;
  type: "choice" | "score" | "noul";
  prompt: string;
  options?: string[];
}

export interface JevResult {
  questionId: string;
  answer: string;
  confidence: number; // 0-1
}

export interface PolicyDecision {
  id: string;
  t: number;
  phase: "ingress" | "egress";
  verdict: Verdict;
  reason: string;
  questions: JevQuestion[];
  results: JevResult[];
  subject: AgentId;
  taskIn?: string;
  taskOut?: PolicyTaskJson;
  actionsIn?: ActionsJson;
}

export interface ActionItem {
  id: string;
  t: number;
  agentId: AgentId;
  kind: "read" | "write" | "cmd" | "plan" | "test";
  summary: string;
  detail: string;
  /** Catalog tool this action used. Checked by code at egress. */
  tool: string;
  /** Path this action touched, if any. Checked by code at egress. */
  path?: string;
}

export interface ActionsJson {
  taskId: string;
  agentId: AgentId;
  startedAt: number;
  finishedAt?: number;
  actions: ActionItem[];
  claimedDone: boolean;
  artifacts: string[];
}

export interface AgentState {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  status: AgentStatus;
  snippet: string;
  lastFile?: string;
  lastCommand?: string;
  tools: string[];
  paths: string[];
  stepLimit: number;
  stepsUsed: number;
}

export interface WorkflowEdit {
  tools: string[];
  paths: string[];
  stepLimit: number;
}

export interface SimEvent {
  id: string;
  t: number;
  actor: AgentId | "system";
  kind: "task" | "plan" | "policy" | "dispatch" | "action" | "actions-json" | "ui";
  text: string;
}

export type ScenarioId = "fix-login-test" | "cleanup-temp" | "wipe-disk";

export type EdgeId = "cp-head" | "head-policy" | "policy-stack" | "stack-policy";

export interface QueueItem {
  agentId: WorkerId;
  label: string;
  status: AgentStatus;
}

export interface SimState {
  scenarioId: ScenarioId;
  tick: number;
  /** Index of the next script step to apply. */
  cursor: number;
  status: RunStatus;
  submitted?: TaskInput;
  inputHistory: TaskInput[];
  plan: string[];
  planRisk?: "low" | "medium" | "high";
  agents: Record<AgentId, AgentState>;
  decisions: PolicyDecision[];
  /** Policy JSON each worker has been handed in this run. */
  taskJson: Partial<Record<WorkerId, PolicyTaskJson>>;
  /** Latest ACTIONS.JSON per worker. */
  actions: Partial<Record<WorkerId, ActionsJson>>;
  reviewed: WorkerId[];
  activeWorker?: WorkerId;
  queue: QueueItem[];
  activeEdge?: EdgeId;
  events: SimEvent[];
}

export interface ScriptStep {
  atTick: number;
  label: string;
  apply: (s: SimState) => void;
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  rawText: string;
  script: ScriptStep[];
}
