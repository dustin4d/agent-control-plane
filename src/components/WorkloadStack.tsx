import { WORKER_IDS } from "../data/catalogs";
import { AgentCard } from "./AgentCard";

export function WorkloadStack({ vertical = false }: { vertical?: boolean }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-2.5" aria-label="Workload Stack">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="panel-title">Workload Stack</h2>
        <span className="text-[11px] text-muted">Workers see JSON only</span>
      </div>
      <div className={vertical ? "flex flex-col gap-2" : "grid grid-cols-1 gap-2 md:grid-cols-3"}>
        {WORKER_IDS.map((id) => (
          <AgentCard key={id} id={id} />
        ))}
      </div>
    </section>
  );
}
