import { useStore } from "../sim/store";
import { StatusChip } from "./VerdictBadge";

export function TaskQueue() {
  const sim = useStore((s) => s.sim);
  const empty =
    sim.status === "idle"
      ? "No tasks yet. Policy fills the queue once it accepts your request."
      : sim.status === "blocked" && sim.queue.length === 0
        ? "Nothing queued. Policy did not accept the request."
        : "Waiting on Policy to route the task.";

  return (
    <section className="panel flex min-h-0 flex-col" aria-labelledby="tq-title">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 id="tq-title" className="panel-title">
          Task queue
        </h2>
        <span className="font-mono text-[11px] text-muted">{sim.queue.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {sim.queue.length === 0 ? (
          <p className="text-[12px] text-muted">{empty}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {sim.queue.map((q, i) => {
              const agent = sim.agents[q.agentId];
              const task = sim.taskJson[q.agentId];
              const live = q.status === "working" || q.status === "waiting-user" || q.status === "waiting-policy";
              return (
                <li key={q.agentId} className="rounded border border-line bg-panel2 p-2.5 animate-fadein">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-[12px] text-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px]">{q.label}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[12px]">
                        <span className="text-muted">→</span>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: agent.color }} aria-hidden />
                        <span style={{ color: agent.color }}>{agent.name}</span>
                        {task && <span className="font-mono text-[11px] text-muted">{task.id}</span>}
                      </div>
                      {live && agent.snippet && (
                        <div className="mt-1 truncate font-mono text-log text-muted">{agent.snippet}</div>
                      )}
                    </div>
                    <StatusChip status={q.status} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
