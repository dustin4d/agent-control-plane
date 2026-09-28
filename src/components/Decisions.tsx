import { AGENT_META } from "../data/catalogs";
import { actions, useStore } from "../sim/store";
import type { WorkerQuestion } from "../types";

function Pending({ q }: { q: WorkerQuestion }) {
  const agent = AGENT_META[q.agentId];
  return (
    <li className="rounded border border-ask/60 bg-ask/5 p-3 animate-fadein" aria-live="assertive">
      <div className="mb-1 text-[11px]" style={{ color: agent.color }}>
        {agent.name} is waiting
      </div>
      <p className="mb-2.5 text-[13px] leading-snug">{q.prompt}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => actions.answer(q.id, o.id)}
            className="flex flex-col items-start gap-0.5 rounded border border-line bg-panel2 p-2 text-left transition-colors duration-150 hover:border-ask"
          >
            <span className="text-[13px] font-semibold">{o.label}</span>
            <span className="text-[11.5px] text-muted">{o.detail}</span>
          </button>
        ))}
      </div>
    </li>
  );
}

function Resolved({ q, cancelled }: { q: WorkerQuestion; cancelled: boolean }) {
  const agent = AGENT_META[q.agentId];
  const chosen = q.options.find((o) => o.id === q.answer);
  return (
    <li className="rounded border border-line bg-panel2 p-2.5 text-[12px]">
      <div className="mb-0.5 text-[11px]" style={{ color: agent.color }}>
        {agent.name}
      </div>
      <p className="text-muted">{q.prompt}</p>
      <p className="mt-1">
        {chosen ? (
          <>
            <span className="text-muted">You chose: </span>
            {chosen.label}
          </>
        ) : (
          <span className="text-muted">{cancelled ? "Cancelled. The run was stopped." : "—"}</span>
        )}
      </p>
    </li>
  );
}

export function Decisions() {
  const sim = useStore((s) => s.sim);
  const pending = sim.status === "waiting-user" ? sim.questions.filter((q) => !q.answer) : [];
  const past = sim.questions.filter((q) => !pending.includes(q));

  return (
    <section className="panel flex min-h-0 flex-col" aria-labelledby="dn-title">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 id="dn-title" className={`panel-title ${pending.length ? "text-ask" : ""}`}>
          Decisions needed
        </h2>
        <span className="font-mono text-[11px] text-muted">{pending.length} open</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {sim.questions.length === 0 ? (
          <p className="text-[12px] text-muted">None. Agents ask here when they need a choice from you to continue.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((q) => (
              <Pending key={q.id} q={q} />
            ))}
            {[...past].reverse().map((q) => (
              <Resolved key={q.id} q={q} cancelled={!q.answer} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
