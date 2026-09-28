import { AGENT_META } from "../data/catalogs";
import { actions, useStore } from "../sim/store";
import { StatusChip } from "./VerdictBadge";

const RISK_COLOR = { low: "#22C55E", medium: "#F5B942", high: "#EF4444" } as const;

export function HeadAgentCard() {
  const head = useStore((s) => s.sim.agents["head-agent"]);
  const plan = useStore((s) => s.sim.plan);
  const risk = useStore((s) => s.sim.planRisk);
  const edge = useStore((s) => s.sim.activeEdge);
  const selected = useStore((s) => s.selected) === "head-agent";

  return (
    <section
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label="Head Agent"
      title={head.snippet || "Idle"}
      onClick={() => actions.select("head-agent")}
      onKeyDown={(e) => e.key === "Enter" && actions.select("head-agent")}
      className="panel relative cursor-pointer overflow-hidden p-2.5 pl-3.5"
      style={selected ? { boxShadow: `0 0 0 2px ${AGENT_META["head-agent"].color}` } : undefined}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: head.color }} aria-hidden />
      <div className="flex items-center justify-between">
        <h2 className="panel-title" style={{ color: head.color }}>
          Head Agent
        </h2>
        <StatusChip status={head.status} />
      </div>
      <ul className="mt-2 space-y-1">
        {plan.length === 0 && <li className="text-[12px] text-muted">No plan yet.</li>}
        {plan.map((b, i) => (
          <li key={i} className="flex gap-1.5 text-[12px] leading-snug animate-fadein">
            <span className="font-mono text-muted">{i + 1}.</span>
            {b}
          </li>
        ))}
      </ul>
      {risk && (
        <div className="mt-2 font-mono text-[11px] text-muted">
          risk <span style={{ color: RISK_COLOR[risk] }}>{risk}</span>
        </div>
      )}
      <div
        className={`mt-2 flex items-center gap-1.5 font-mono text-[11px] ${edge === "head-policy" ? "text-policy" : "text-muted"}`}
      >
        <span className="h-px flex-1 bg-current" />→ Policy
      </div>
    </section>
  );
}
