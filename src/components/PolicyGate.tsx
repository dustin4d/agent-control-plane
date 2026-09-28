import { useState, type ReactNode } from "react";
import { JEV_HELP } from "../sim/jev";
import { lastConfidence, latestDecision } from "../sim/selectors";
import { actions, useStore } from "../sim/store";
import type { PolicyDecision } from "../types";
import { JsonBlock, Stamp } from "./JsonBlock";
import { Pipeline } from "./Pipeline";
import { StatusChip, VerdictBadge } from "./VerdictBadge";

function Meter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded border border-line bg-panel2 px-2 py-1.5">
      <span className="text-[10.5px] uppercase tracking-wide text-muted">{label}</span>
      <span className="font-mono text-[13px]">{children}</span>
    </div>
  );
}

export function QuestionList({ decision }: { decision: PolicyDecision }) {
  return (
    <table className="w-full font-mono text-log">
      <tbody>
        {decision.questions.map((q) => {
          const r = decision.results.find((x) => x.questionId === q.id);
          return (
            <tr key={q.id} className="animate-fadein">
              <td className="w-14 pr-2 text-muted">{q.type}</td>
              <td className="pr-2">{q.prompt}</td>
              <td className="pr-2 text-policy">{r?.answer ?? "…"}</td>
              <td className="text-right tabular-nums">{r ? r.confidence.toFixed(2) : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function PolicyGate() {
  const sim = useStore((s) => s.sim);
  const selected = useStore((s) => s.selected) === "policy-agent";
  const [help, setHelp] = useState(false);
  const policy = sim.agents["policy-agent"];
  const ingress = latestDecision(sim, "ingress");
  const egress = latestDecision(sim, "egress");
  const last = latestDecision(sim);
  const conf = lastConfidence(last);
  const active = policy.status !== "idle";
  const idle = sim.status === "idle";

  return (
    <section
      className="panel flex flex-col gap-2 p-2.5"
      style={selected ? { boxShadow: "0 0 0 2px #F5B942" } : undefined}
      aria-label="Policy Agent"
    >
      <Pipeline />
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="panel-title text-left text-policy hover:underline"
          onClick={() => actions.select("policy-agent")}
          title={policy.snippet || "GATE READY"}
        >
          Policy Agent · Jev gate
        </button>
        <div className="relative flex items-center gap-2">
          <StatusChip status={policy.status} />
          <button
            type="button"
            className="h-5 w-5 rounded-full border border-line text-[11px] text-muted hover:text-ink"
            aria-label="What does Jev do?"
            aria-expanded={help}
            onClick={() => setHelp((h) => !h)}
          >
            ?
          </button>
          {help && (
            <div className="absolute right-0 top-7 z-20 w-64 rounded border border-policy/50 bg-panel p-2 text-[12px] shadow-lg animate-fadein">
              {JEV_HELP}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Meter label="Ingress verdict">
          <VerdictBadge verdict={ingress?.verdict} />
        </Meter>
        <Meter label="Egress verdict">
          <VerdictBadge verdict={egress?.verdict} />
        </Meter>
        <Meter label="Last confidence">
          <span className="tabular-nums">{conf === undefined ? "—" : conf.toFixed(2)}</span>
        </Meter>
        <Meter label="Open questions">
          <span className="tabular-nums">{active && last && policy.status !== "done" ? last.questions.length : 0}</span>
        </Meter>
      </div>

      {idle && <p className="font-mono text-[12px] text-muted">GATE READY</p>}

      {last && (
        <>
          <div className="rounded border border-line bg-panel2 px-2 py-1">
            <div className="mb-1 flex items-center gap-2 text-[10.5px] uppercase tracking-wide text-muted">
              {last.phase} · <VerdictBadge verdict={last.verdict} />
              <span className="truncate normal-case tracking-normal">{last.reason}</span>
            </div>
            <QuestionList decision={last} />
          </div>
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            <JsonBlock title="Task in" value={last.taskIn} className="max-h-48" />
            <JsonBlock
              title="Task out"
              value={last.taskOut}
              className="max-h-48"
              stamp={last.verdict === "deny" ? <Stamp text="BLOCKED" color="#EF4444" /> : undefined}
            />
          </div>
        </>
      )}
      <p className="text-[11px] text-muted">Workers never see raw user text. They only see Policy JSON.</p>
    </section>
  );
}
