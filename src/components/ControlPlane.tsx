import { useEffect, useState } from "react";
import { latestDecision, runSummary } from "../sim/selectors";
import { actions, useStore } from "../sim/store";
import type { SimState } from "../types";
import { StatusChip } from "./VerdictBadge";

/** True for a moment each time the shake counter bumps. */
function useShake(counter: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (counter === 0) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 450);
    return () => clearTimeout(t);
  }, [counter]);
  return on;
}

function Banner({ sim }: { sim: SimState }) {
  if (sim.status === "complete") {
    const { workers, denials } = runSummary(sim);
    return (
      <div className="rounded border border-allow/50 bg-allow/10 px-2 py-1.5 text-[12px] text-allow animate-fadein" role="status">
        Run complete. {workers} worker{workers === 1 ? "" : "s"}. {denials} denial{denials === 1 ? "" : "s"}.
      </div>
    );
  }
  if (sim.status !== "blocked") return null;
  const last = latestDecision(sim);
  const text =
    last?.phase === "ingress"
      ? "Policy denied this task. No worker received work."
      : last?.verdict === "ask"
        ? `Policy wants review: ${last.reason}`
        : `Run blocked: ${last?.reason ?? "policy deny"}.`;
  const tone = last?.verdict === "ask" ? "border-ask/50 bg-ask/10 text-ask" : "border-deny/50 bg-deny/10 text-deny";
  return (
    <div className={`rounded border px-2 py-1.5 text-[12px] animate-fadein ${tone}`} role="alert">
      {text}
    </div>
  );
}

export function ControlPlane() {
  const sim = useStore((s) => s.sim);
  const draft = useStore((s) => s.draft);
  const shake = useStore((s) => s.shake);
  const selected = useStore((s) => s.selected);
  const cp = sim.agents["control-plane"];
  const locked = sim.status !== "idle";
  const shaking = useShake(shake);
  const canSend = sim.status === "idle" || sim.status === "complete" || sim.status === "blocked";

  return (
    <section
      className={`panel flex flex-col gap-2 p-2.5 ${selected === "control-plane" ? "ring-2 ring-muted" : ""}`}
      onClick={() => actions.select("control-plane")}
      aria-label="Control Plane"
    >
      <div className="flex items-center justify-between">
        <h2 className="panel-title">Control Plane</h2>
        <StatusChip status={cp.status} />
      </div>

      {locked && sim.submitted ? (
        <div className="rounded border border-line bg-panel2 p-2">
          <div className="mb-1 flex items-center justify-between text-[10.5px] uppercase tracking-wide text-muted">
            <span>raw task · {sim.submitted.id}</span>
            <span aria-hidden>🔒</span>
          </div>
          <p className="font-mono text-[12px] leading-snug">{sim.submitted.rawText}</p>
        </div>
      ) : null}

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          actions.run();
        }}
      >
        <label htmlFor="composer" className="sr-only">
          Task
        </label>
        <textarea
          id="composer"
          rows={3}
          value={draft}
          onChange={(e) => actions.setDraft(e.target.value)}
          disabled={!canSend}
          placeholder="Send a task. Policy will rewrite it before any worker sees it."
          className={`resize-none rounded border bg-panel2 p-2 font-mono text-[12px] leading-snug text-ink placeholder:text-muted/70 focus:border-muted focus:outline-none ${
            shaking ? "animate-shake border-deny" : "border-line"
          }`}
        />
        <button type="submit" className="btn justify-center border-head/60" disabled={!canSend}>
          Send to Head Agent
        </button>
      </form>

      <Banner sim={sim} />
      <p className="text-[11px] text-muted">UI talks to Control Plane only.</p>
    </section>
  );
}
