import { useStore } from "../sim/store";
import { StatusChip } from "./VerdictBadge";

export function Queue() {
  const queue = useStore((s) => s.sim.queue);
  const agents = useStore((s) => s.sim.agents);

  return (
    <section className="panel p-2.5" aria-label="Queue">
      <h2 className="panel-title mb-2">Queue</h2>
      {queue.length === 0 ? (
        <p className="text-[12px] text-muted">Empty. Policy fills the queue after ingress.</p>
      ) : (
        <ol className="space-y-1.5">
          {queue.map((q, i) => (
            <li key={q.agentId} className="flex items-center gap-2 text-[12px] animate-fadein">
              <span className="font-mono text-muted">{i + 1}</span>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: agents[q.agentId].color }} />
              <span className="min-w-0 flex-1 truncate">{q.label}</span>
              <StatusChip status={q.status} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
