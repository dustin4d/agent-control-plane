import { isWorker } from "../data/catalogs";
import { actions as ui, useStore } from "../sim/store";
import type { ActionsJson, WorkerId } from "../types";
import { Stamp } from "./JsonBlock";

const ind = (n: number) => "  ".repeat(n);

/** Pretty JSON split into lines so the newest action row can be highlighted. */
function toLines(doc: ActionsJson): { text: string; newest: boolean }[] {
  const { actions, ...head } = doc;
  const lines: { text: string; newest: boolean }[] = [{ text: "{", newest: false }];
  const push = (text: string, newest = false) => lines.push({ text, newest });
  for (const [k, v] of Object.entries(head).filter(([k]) => k !== "claimedDone" && k !== "artifacts")) {
    push(`${ind(1)}${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  }
  push(`${ind(1)}"actions": [${actions.length === 0 ? "]," : ""}`);
  actions.forEach((a, i) => {
    const body = JSON.stringify(a, null, 2).split("\n");
    body.forEach((l, j) => {
      const comma = j === body.length - 1 && i < actions.length - 1 ? "," : "";
      push(`${ind(2)}${l}${comma}`, i === actions.length - 1);
    });
  });
  if (actions.length > 0) push(`${ind(1)}],`);
  push(`${ind(1)}"claimedDone": ${JSON.stringify(doc.claimedDone)},`);
  push(`${ind(1)}"artifacts": ${JSON.stringify(doc.artifacts)}`);
  push("}");
  return lines;
}

export function ActionsJsonPanel({ className = "" }: { className?: string }) {
  const sim = useStore((s) => s.sim);
  const selected = useStore((s) => s.selected);
  const shown: WorkerId | undefined =
    sim.activeWorker ??
    (selected && isWorker(selected) && sim.actions[selected] ? selected : undefined) ??
    [...sim.reviewed].reverse()[0];
  const doc = shown ? sim.actions[shown] : undefined;
  const reviewed = shown ? sim.reviewed.includes(shown) : false;
  const color = shown ? sim.agents[shown].color : "#8B9BB0";

  return (
    <section className={`panel flex min-h-[160px] flex-col ${className}`} aria-label="ACTIONS.JSON">
      <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5">
        <h2 className="panel-title">ACTIONS.JSON</h2>
        {shown && (
          <button type="button" className="font-mono text-[11px]" style={{ color }} onClick={() => ui.select(shown)}>
            {shown} · {doc?.actions.length ?? 0} actions
          </button>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {doc ? (
          <pre className="h-full overflow-auto p-2 font-mono text-log [max-width:80ch]">
            {toLines(doc).map((l, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap break-words ${l.newest && !reviewed ? "bg-policy/10 animate-fadein" : ""}`}
                style={l.newest && !reviewed ? { boxShadow: `inset 2px 0 0 ${color}` } : undefined}
              >
                {l.text}
              </div>
            ))}
          </pre>
        ) : (
          <p className="p-2.5 text-[12px] text-muted">No worker output yet. The active worker's ACTIONS.JSON grows here.</p>
        )}
        {doc && reviewed && (
          <div className="pointer-events-none absolute right-3 top-3">
            <Stamp text="POLICY REVIEWED" color="#F5B942" />
          </div>
        )}
      </div>
    </section>
  );
}
