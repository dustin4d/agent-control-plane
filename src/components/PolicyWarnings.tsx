import { AGENT_META } from "../data/catalogs";
import { policyWarnings } from "../sim/selectors";
import { useStore } from "../sim/store";
import { VERDICT_COLOR, VerdictBadge } from "./VerdictBadge";

const PHASE_LABEL = { ingress: "Before dispatch", egress: "After work" } as const;

export function PolicyWarnings() {
  const sim = useStore((s) => s.sim);
  const warnings = policyWarnings(sim);

  return (
    <section className="panel flex min-h-0 flex-col" aria-labelledby="pw-title">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 id="pw-title" className="panel-title text-policy">
          Policy warnings
        </h2>
        <span className="font-mono text-[11px] text-muted">{warnings.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {warnings.length === 0 ? (
          <p className="text-[12px] text-muted">
            {sim.status === "idle" ? "No warnings. Policy checks every task before it reaches an agent." : "No warnings so far."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...warnings].reverse().map(({ decision: d, changes }) => (
              <li
                key={d.id}
                className="rounded border border-line bg-panel2 p-2.5 animate-fadein"
                style={{ boxShadow: `inset 3px 0 0 ${VERDICT_COLOR[d.verdict]}` }}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <VerdictBadge verdict={d.verdict} />
                  <span>{PHASE_LABEL[d.phase]}</span>
                  {d.subject !== "policy-agent" && (
                    <span style={{ color: AGENT_META[d.subject].color }}>· {AGENT_META[d.subject].name}</span>
                  )}
                </div>
                <p className="text-[12.5px] leading-snug">{d.reason}</p>
                {d.verdict === "deny" && d.phase === "ingress" && (
                  <p className="mt-1 text-[12px] text-deny">No agent received work.</p>
                )}
                {changes.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 font-mono text-log text-muted">
                    {changes.map((c) => (
                      <li key={c}>– {c}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
