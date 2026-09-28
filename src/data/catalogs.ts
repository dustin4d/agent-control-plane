import type { AgentId, AgentState, WorkerId, WorkflowEdit } from "../types";

/** Per-worker bounds. Policy JSON can never exceed these. */
export const DEFAULT_WORKFLOW: Record<WorkerId, WorkflowEdit> = {
  "model-agent": { tools: ["read", "agents.md.update"], paths: ["AGENTS.md"], stepLimit: 4 },
  "dev-agent": { tools: ["read", "write", "search", "test", "patch"], paths: ["src/", "tests/"], stepLimit: 8 },
  "os-agent": { tools: ["ls", "rm"], paths: ["/tmp/demo-cache"], stepLimit: 6 },
};

const WORKERS = Object.keys(DEFAULT_WORKFLOW) as WorkerId[];
const isWorker = (id: AgentId): id is WorkerId => (WORKERS as AgentId[]).includes(id);

interface AgentMeta {
  name: string;
  role: string;
  color: string;
}

export const AGENT_META: Record<AgentId, AgentMeta> = {
  "control-plane": { name: "Control Plane", role: "Only entry point. UI talks to Control Plane only.", color: "#8B9BB0" },
  "user-agent": {
    name: "User Agent",
    role: "Parses plain-language instructions into policy-compatible JSON for the Policy Agent.",
    color: "#8B5CF6",
  },
  "policy-agent": { name: "Policy Agent", role: "Checks task JSON before dispatch and reviews ACTIONS.JSON after.", color: "#F5B942" },
  "model-agent": { name: "Specialized Model", role: "Customized with AGENTS.md", color: "#F59E0B" },
  "dev-agent": { name: "Software Development", role: "Reads, patches and tests code in allowed paths.", color: "#3B82F6" },
  "os-agent": { name: "Terminal/OS controller", role: "Runs bounded shell commands in allowed paths.", color: "#22C55E" },
};

export function initialAgents(workflow: Record<WorkerId, WorkflowEdit>): Record<AgentId, AgentState> {
  const entries = (Object.keys(AGENT_META) as AgentId[]).map((id): [AgentId, AgentState] => {
    const bounds = isWorker(id) ? workflow[id] : { tools: [], paths: [], stepLimit: 0 };
    return [
      id,
      {
        id,
        ...AGENT_META[id],
        status: "idle",
        snippet: "",
        tools: [...bounds.tools],
        paths: [...bounds.paths],
        stepLimit: bounds.stepLimit,
        stepsUsed: 0,
      },
    ];
  });
  return Object.fromEntries(entries) as Record<AgentId, AgentState>;
}
