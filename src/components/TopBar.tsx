import { SCENARIOS, SCENARIO_IDS } from "../sim/scenarios";
import { fmtTime, policyHealth, type Health } from "../sim/selectors";
import { actions, SPEEDS, useStore } from "../sim/store";
import type { ScenarioId } from "../types";
import { VERDICT_COLOR } from "./VerdictBadge";

const HEALTH_COLOR: Record<Health, string> = {
  "GATE READY": "#8B9BB0",
  "GATE OPEN": "#22C55E",
  REVIEW: "#F5B942",
  BLOCKED: "#EF4444",
};

export function TopBar() {
  const sim = useStore((s) => s.sim);
  const speed = useStore((s) => s.speed);
  const health = policyHealth(sim);
  const live = sim.status === "running" || sim.status === "paused";

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-panel px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rotate-45 rounded-sm border-2 border-policy" aria-hidden />
        <span className="font-semibold tracking-wide">Policy Mesh</span>
      </div>

      <label className="flex items-center gap-1.5 text-[12px] text-muted">
        Scenario
        <select
          className="rounded border border-line bg-panel2 px-1.5 py-1 font-mono text-[12px] text-ink"
          value={sim.scenarioId}
          onChange={(e) => actions.setScenario(e.target.value as ScenarioId)}
        >
          {SCENARIO_IDS.map((id) => (
            <option key={id} value={id}>
              {SCENARIOS[id].title}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1" role="group" aria-label="Run controls">
        <button type="button" className="btn" onClick={actions.run} disabled={sim.status === "running"} title="Run (R)">
          ▶ Run
        </button>
        <button type="button" className="btn" onClick={actions.togglePause} disabled={!live} title="Pause / resume (Space)">
          {sim.status === "paused" ? "▶ Resume" : "❚❚ Pause"}
        </button>
        <button type="button" className="btn" onClick={actions.step} disabled={sim.status === "complete" || sim.status === "blocked"} title="Step (.)">
          ↦ Step
        </button>
        <button type="button" className="btn" onClick={actions.reset} title="Reset">
          ↺ Reset
        </button>
        <button type="button" className="btn border-deny/50 text-deny" onClick={actions.kill} disabled={!live} title="Kill active worker">
          ■ Kill
        </button>
      </div>

      <label className="flex items-center gap-1.5 text-[12px] text-muted">
        Speed
        <select
          className="rounded border border-line bg-panel2 px-1.5 py-1 font-mono text-[12px] text-ink"
          value={speed}
          onChange={(e) => actions.setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])}
        >
          {SPEEDS.map((sp) => (
            <option key={sp} value={sp}>
              {sp}x
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3 font-mono text-[12px] text-muted">
        <span>
          tick <span className="tabular-nums text-ink">{sim.tick.toString().padStart(3, "0")}</span>
        </span>
        <span className="tabular-nums text-ink">{fmtTime(sim.tick)}</span>
        <span className="uppercase">{sim.status}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 text-[11px] text-muted md:flex" aria-label="Verdict legend">
          {(["allow", "ask", "deny"] as const).map((v) => (
            <span key={v} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: VERDICT_COLOR[v] }} />
              {v}
            </span>
          ))}
        </div>
        <span
          className="chip px-2 py-0.5 font-semibold"
          style={{ color: HEALTH_COLOR[health], boxShadow: `inset 0 0 0 1px ${HEALTH_COLOR[health]}` }}
          aria-label="Policy health"
        >
          {health}
        </span>
      </div>
    </header>
  );
}
