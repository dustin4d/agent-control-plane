import type { ReactNode } from "react";
import { AGENT_META, isWorker } from "../data/catalogs";
import { decisionFor, eventsFor, fmtTime } from "../sim/selectors";
import { actions, useStore, type InspectorTab } from "../sim/store";
import type { AgentId, PolicyDecision, SimState } from "../types";
import { JsonBlock } from "./JsonBlock";
import { ConfidenceBar, StatusChip, VerdictBadge } from "./VerdictBadge";
import { WorkflowEditor } from "./WorkflowEditor";

const TABS: InspectorTab[] = ["Overview", "JSON", "Workflow", "Jev"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="panel-title mb-1">{label}</div>
      {children}
    </div>
  );
}

function Tags({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <span className="text-[12px] text-muted">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((t) => (
        <span key={t} className="rounded border border-line bg-panel2 px-1.5 py-0.5 font-mono text-[11px]">
          {t}
        </span>
      ))}
    </div>
  );
}

function DecisionRow({ d }: { d: PolicyDecision }) {
  return (
    <li className="flex items-start gap-2 font-mono text-log animate-fadein">
      <span className="shrink-0 text-muted">{fmtTime(d.t)}</span>
      <span className="w-12 shrink-0 text-muted">{d.phase}</span>
      <VerdictBadge verdict={d.verdict} />
      <span className="min-w-0 break-words">{d.reason}</span>
    </li>
  );
}

function Overview({ sim, id }: { sim: SimState; id: AgentId }) {
  const a = sim.agents[id];
  const events = eventsFor(sim, id);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px]">{AGENT_META[id].role}</p>
      <Field label="Status">
        <div className="flex items-center gap-2">
          <StatusChip status={a.status} />
          <span className="truncate font-mono text-log text-muted">{a.snippet.split("\n")[0]}</span>
        </div>
      </Field>

      {isWorker(id) && (
        <>
          <Field label="Allowed tools">
            <Tags items={sim.taskJson[id]?.allowedTools ?? a.tools} empty="none" />
          </Field>
          <Field label="Allowed paths">
            <Tags items={sim.taskJson[id]?.allowedPaths ?? a.paths} empty="none" />
          </Field>
          <Field label="Last file / command">
            <div className="font-mono text-log">
              <div>{a.lastFile ?? "—"}</div>
              <div>{a.lastCommand ? `$ ${a.lastCommand}` : "—"}</div>
            </div>
          </Field>
        </>
      )}

      {id === "control-plane" && (
        <Field label="Raw input history">
          {sim.inputHistory.length === 0 ? (
            <span className="text-[12px] text-muted">Nothing sent yet.</span>
          ) : (
            <ol className="space-y-1">
              {[...sim.inputHistory].reverse().map((t) => (
                <li key={t.id} className="rounded border border-line bg-panel2 p-1.5 font-mono text-log">
                  <span className="text-muted">{t.id}</span> {t.rawText}
                </li>
              ))}
            </ol>
          )}
        </Field>
      )}

      {id === "head-agent" && (
        <Field label="Plan">
          <Tags items={sim.plan} empty="No plan yet." />
        </Field>
      )}

      {id === "policy-agent" && (
        <Field label="Ingress and egress history">
          {sim.decisions.length === 0 ? (
            <span className="text-[12px] text-muted">GATE READY. No decisions yet.</span>
          ) : (
            <ul className="space-y-1">
              {sim.decisions.map((d) => (
                <DecisionRow key={d.id} d={d} />
              ))}
            </ul>
          )}
        </Field>
      )}

      <Field label="Last 8 events">
        {events.length === 0 ? (
          <span className="text-[12px] text-muted">No events.</span>
        ) : (
          <ul className="space-y-0.5 font-mono text-log">
            {events.map((e) => (
              <li key={e.id} className="flex gap-2 animate-fadein">
                <span className="shrink-0 text-muted">{fmtTime(e.t)}</span>
                <span className="min-w-0 break-words">{e.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Field>
      <p className="border-t border-line pt-2 text-[11px] text-muted">
        Workers never see raw user text. They only see Policy JSON. UI never talks to workers. UI talks to Control Plane
        only.
      </p>
    </div>
  );
}

function JsonTab({ sim, id }: { sim: SimState; id: AgentId }) {
  if (isWorker(id)) {
    return (
      <div className="flex flex-col gap-2">
        <JsonBlock title="PolicyTaskJson" value={sim.taskJson[id]} copy />
        <JsonBlock title="ActionsJson" value={sim.actions[id]} copy />
      </div>
    );
  }
  if (id === "policy-agent") return <JsonBlock title="Latest PolicyDecision" value={decisionFor(sim, id)} copy />;
  if (id === "control-plane") return <JsonBlock title="TaskInput[]" value={sim.inputHistory} copy />;
  return <JsonBlock title="Plan" value={{ risk: sim.planRisk ?? null, plan: sim.plan }} copy />;
}

function JevTable({ d }: { d: PolicyDecision }) {
  return (
    <div className="flex flex-col gap-2 rounded border border-line bg-panel2 p-2">
      <div className="flex items-center gap-2 font-mono text-log">
        <span className="text-muted">{fmtTime(d.t)}</span>
        <span className="uppercase text-muted">{d.phase}</span>
        <VerdictBadge verdict={d.verdict} />
        <span className="text-muted">{d.subject}</span>
      </div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[10.5px] uppercase tracking-wide text-muted">
            <th className="pb-1 font-normal">type</th>
            <th className="pb-1 font-normal">question</th>
            <th className="pb-1 font-normal">answer</th>
            <th className="pb-1 font-normal">confidence</th>
          </tr>
        </thead>
        <tbody className="font-mono text-log">
          {d.questions.map((q) => {
            const r = d.results.find((x) => x.questionId === q.id);
            return (
              <tr key={q.id} className="align-top">
                <td className="py-0.5 pr-2 text-muted">{q.type}</td>
                <td className="py-0.5 pr-2">
                  {q.prompt}
                  {q.options && <div className="text-[10px] text-muted">{q.options.join(" / ")}</div>}
                </td>
                <td className="py-0.5 pr-2 text-policy">{r?.answer ?? "—"}</td>
                <td className="py-0.5">{r ? <ConfidenceBar value={r.confidence} /> : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[12px]">
        <span className="panel-title mr-1">reason</span>
        {d.reason}
      </p>
    </div>
  );
}

function JevTab({ sim, id }: { sim: SimState; id: AgentId }) {
  if (id === "policy-agent") {
    if (sim.decisions.length === 0) return <p className="text-[12px] text-muted">No Jev decisions yet.</p>;
    return (
      <div className="flex flex-col gap-2">
        {[...sim.decisions].reverse().map((d) => (
          <JevTable key={d.id} d={d} />
        ))}
      </div>
    );
  }
  const d = decisionFor(sim, id);
  return d ? <JevTable d={d} /> : <p className="text-[12px] text-muted">No Jev decision has touched this node yet.</p>;
}

export function Inspector({ className = "" }: { className?: string }) {
  const sim = useStore((s) => s.sim);
  const selected = useStore((s) => s.selected);
  const tab = useStore((s) => s.tab);

  return (
    <aside className={`panel flex min-h-0 flex-col ${className}`} aria-label="Inspector">
      <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5">
        <h2 className="panel-title">Inspector</h2>
        {selected && (
          <span className="truncate text-[12px] font-semibold" style={{ color: AGENT_META[selected].color }}>
            {AGENT_META[selected].name}
          </span>
        )}
      </div>
      <div className="flex border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => actions.setTab(t)}
            className={`flex-1 border-b-2 px-2 py-1.5 text-[12px] transition-colors duration-150 ${
              tab === t ? "border-policy text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2.5" role="tabpanel">
        {!selected ? (
          <p className="text-[12px] text-muted">Select a node. Click a card or press 1-6.</p>
        ) : tab === "Overview" ? (
          <Overview sim={sim} id={selected} />
        ) : tab === "JSON" ? (
          <JsonTab sim={sim} id={selected} />
        ) : tab === "Workflow" ? (
          isWorker(selected) ? (
            <WorkflowEditor key={selected} id={selected} />
          ) : (
            <p className="text-[12px] text-muted">Workflow bounds apply to workers only. Select Model, Dev or OS.</p>
          )
        ) : (
          <JevTab sim={sim} id={selected} />
        )}
      </div>
    </aside>
  );
}
