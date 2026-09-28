import { actions, useStore } from "../sim/store";
import type { AgentId, EdgeId } from "../types";

interface Node {
  id: AgentId | "stack";
  label: string;
  x: number;
  y: number;
  w: number;
  color: string;
}

const NODES: Node[] = [
  { id: "control-plane", label: "Control Plane", x: 10, y: 10, w: 110, color: "#8B9BB0" },
  { id: "head-agent", label: "Head Agent", x: 170, y: 10, w: 100, color: "#8B5CF6" },
  { id: "policy-agent", label: "Policy / Jev", x: 320, y: 10, w: 110, color: "#F5B942" },
  { id: "stack", label: "Workload Stack", x: 480, y: 10, w: 130, color: "#E7EEF7" },
];

const H = 28;

const EDGES: { id: EdgeId; d: string; color: string }[] = [
  { id: "cp-head", d: "M120 24 H170", color: "#8B9BB0" },
  { id: "head-policy", d: "M270 24 H320", color: "#8B5CF6" },
  { id: "policy-stack", d: "M430 20 H480", color: "#F5B942" },
  { id: "stack-policy", d: "M545 38 V62 H375 V38", color: "#F5B942" },
];

/** Simple boxes with thin lines. The active edge pulses. */
export function Pipeline() {
  const edge = useStore((s) => s.sim.activeEdge);
  const worker = useStore((s) => s.sim.activeWorker);
  const workerColor = useStore((s) => (s.sim.activeWorker ? s.sim.agents[s.sim.activeWorker].color : "#E7EEF7"));

  return (
    <svg viewBox="0 0 620 76" className="h-[76px] w-full" role="img" aria-label="Pipeline">
      <defs>
        <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="#8B9BB0" />
        </marker>
      </defs>
      {EDGES.map((e) => {
        const active = edge === e.id;
        const color = e.id === "policy-stack" && worker ? workerColor : e.color;
        return (
          <g key={e.id}>
            <path d={e.d} fill="none" stroke="#243041" strokeWidth={1} markerEnd="url(#arrow)" />
            {active && (
              <path d={e.d} fill="none" stroke={color} strokeWidth={2} strokeDasharray="6 4" className="animate-dash" />
            )}
          </g>
        );
      })}
      <text x={460} y={72} textAnchor="middle" className="fill-muted font-mono" fontSize={9}>
        ACTIONS.JSON
      </text>
      {NODES.map((n) => {
        const clickable = n.id !== "stack";
        return (
          <g
            key={n.id}
            className={clickable ? "cursor-pointer" : undefined}
            onClick={clickable ? () => actions.select(n.id as AgentId) : undefined}
          >
            <rect x={n.x} y={n.y} width={n.w} height={H} rx={4} fill="#0F141C" stroke={n.color} strokeOpacity={0.7} />
            <text x={n.x + n.w / 2} y={n.y + 18} textAnchor="middle" fontSize={11} fill={n.color}>
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
