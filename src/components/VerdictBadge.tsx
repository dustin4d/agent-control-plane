import type { AgentStatus, Verdict } from "../types";

export const VERDICT_COLOR: Record<Verdict, string> = {
  allow: "#22C55E",
  rewrite: "#22C55E",
  ask: "#F5B942",
  deny: "#EF4444",
};

const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: "#8B9BB0",
  queued: "#8B9BB0",
  working: "#3B82F6",
  "waiting-policy": "#F5B942",
  done: "#22C55E",
  error: "#EF4444",
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Idle",
  queued: "Queued",
  working: "Working",
  "waiting-policy": "Waiting on Policy",
  done: "Done",
  error: "Error",
};

function tint(color: string): { color: string; backgroundColor: string; boxShadow: string } {
  return { color, backgroundColor: `${color}1A`, boxShadow: `inset 0 0 0 1px ${color}55` };
}

export function VerdictBadge({ verdict }: { verdict?: Verdict }) {
  if (!verdict) {
    return (
      <span className="chip" style={tint("#8B9BB0")}>
        —
      </span>
    );
  }
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

export function ConfidenceBar({ value, color = "#F5B942" }: { value: number; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`confidence ${value.toFixed(2)}`}>
      <span className="relative h-1.5 w-16 overflow-hidden rounded bg-line">
        <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </span>
      <span className="font-mono text-[11px] tabular-nums">{value.toFixed(2)}</span>
    </span>
  );
}
