import { actions, useStore } from "../sim/store";
import type { WorkerId } from "../types";
import { StatusChip } from "./VerdictBadge";

export function AgentCard({ id }: { id: WorkerId }) {
  const a = useStore((s) => s.sim.agents[id]);
  const selected = useStore((s) => s.selected) === id;
  const lines = (a.snippet || (a.status === "idle" ? "Idle" : "—")).split("\n");
  const last = a.lastCommand ? `$ ${a.lastCommand}` : a.lastFile;

  return (
    <button
      type="button"
      onClick={() => actions.select(id)}
      aria-pressed={selected}
      title={a.snippet.split("\n")[0] || "Idle"}
      className={`relative flex w-full min-w-0 flex-col gap-1 overflow-hidden rounded-md border bg-panel2 p-2 pl-3 text-left transition-colors duration-200 ${
        a.status === "working" ? "bg-panel" : ""
      }`}
      style={{ borderColor: selected ? a.color : "#243041", borderWidth: selected ? 2 : 1 }}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${a.status === "working" ? "animate-pulse" : ""}`}
        style={{ backgroundColor: a.color }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold" style={{ color: a.color }}>
            {a.name}
          </div>
          <div className="truncate text-[11px] text-muted">{a.role}</div>
        </div>
        <StatusChip status={a.status} />
      </div>
      <div className="min-h-[30px] font-mono text-log text-ink/90">
        {lines.slice(0, 2).map((l, i) => (
          <div key={`${i}-${l}`} className="truncate animate-fadein">
            {l}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted">
        <span className="truncate">{last ?? "no file or command yet"}</span>
        <span className="shrink-0 tabular-nums">
          steps {a.stepsUsed}/{a.stepLimit}
        </span>
      </div>
    </button>
  );
}
