export type AgentId =
  | "control-plane"
  | "user-agent"
  | "policy-agent"
  | "model-agent"
  | "dev-agent"
  | "os-agent";

export type WorkerId = Exclude<AgentId, "control-plane" | "user-agent" | "policy-agent">;

export type Verdict = "allow" | "rewrite" | "ask" | "deny";
export type RunStatus = "idle" | "running" | "waiting-user" | "complete" | "blocked";
export type AgentStatus = "idle" | "queued" | "working" | "waiting-policy" | "waiting-user" | "done" | "error";

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

/** What the User Agent parses plain language into. Policy checks it before any worker sees work. */
export type UserTaskJson = Omit<PolicyTaskJson, "id">;

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
  /** User Agent JSON, on ingress. */
  taskIn?: UserTaskJson;
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

export interface ChoiceOption {
  id: string;
  label: string;
  detail: string;
}

/** A choice a workload agent needs from the user before it can continue. */
export interface WorkerQuestion {
  id: string;
  t: number;
  agentId: WorkerId;
  prompt: string;
  options: ChoiceOption[];
  answer?: string;
}

export type ScenarioId = "fix-login-test" | "cleanup-temp" | "wipe-disk";

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
  /** User Agent output, once parsed. */
  parsed?: UserTaskJson;
  agents: Record<AgentId, AgentState>;
  decisions: PolicyDecision[];
  /** Policy JSON each worker has been handed in this run. */
  taskJson: Partial<Record<WorkerId, PolicyTaskJson>>;
  /** Latest ACTIONS.JSON per worker. */
  actions: Partial<Record<WorkerId, ActionsJson>>;
  activeWorker?: WorkerId;
  queue: QueueItem[];
  questions: WorkerQuestion[];
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
