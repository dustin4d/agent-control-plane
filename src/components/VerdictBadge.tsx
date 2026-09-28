import type { AgentStatus, Verdict } from "../types";

export const VERDICT_COLOR: Record<Verdict, string> = {
  allow: "#22C55E",
  rewrite: "#F5B942",
  ask: "#F5B942",
  deny: "#EF4444",
};

const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: "#8B9BB0",
  queued: "#8B9BB0",
  working: "#3B82F6",
  "waiting-policy": "#F5B942",
  "waiting-user": "#F5B942",
  done: "#22C55E",
  error: "#EF4444",
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Idle",
  queued: "Queued",
  working: "Working",
  "waiting-policy": "Waiting on Policy",
  "waiting-user": "Needs decision",
  done: "Done",
  error: "Stopped",
};

export function tint(color: string): { color: string; backgroundColor: string; boxShadow: string } {
  return { color, backgroundColor: `${color}1A`, boxShadow: `inset 0 0 0 1px ${color}55` };
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className="chip" style={tint(VERDICT_COLOR[verdict])}>
      {verdict}
    </span>
  );
}

export function StatusChip({ status }: { status: AgentStatus }) {
  return (
    <span className="chip whitespace-nowrap" style={tint(STATUS_COLOR[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}
