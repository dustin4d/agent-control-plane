import { useEffect, useRef } from "react";
import { fmtTime } from "../sim/selectors";
import { useStore } from "../sim/store";
import type { SimEvent } from "../types";

const ACTOR_LABEL: Record<SimEvent["actor"], string> = {
  system: "system",
  "control-plane": "control",
  "head-agent": "head",
  "policy-agent": "policy",
  "model-agent": "model",
  "dev-agent": "dev",
  "os-agent": "os",
};

const ACTOR_COLOR: Record<SimEvent["actor"], string> = {
  system: "#8B9BB0",
  "control-plane": "#8B9BB0",
  "head-agent": "#8B5CF6",
  "policy-agent": "#F5B942",
  "model-agent": "#F59E0B",
  "dev-agent": "#3B82F6",
  "os-agent": "#22C55E",
};

/** Last 20 events, newest on the right. */
export function EventTicker() {
  const events = useStore((s) => s.sim.events);
  const ref = useRef<HTMLOListElement>(null);
  const recent = events.slice(-20);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [events.length]);

  return (
    <footer className="flex h-10 items-center border-t border-line bg-panel" aria-label="Event ticker">
      <span className="panel-title shrink-0 border-r border-line px-3">Events</span>
      <ol ref={ref} className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto px-3 font-mono text-log" aria-live="polite">
        {recent.length === 0 && <li className="text-muted">No events. Send a task to start.</li>}
        {recent.map((e) => (
          <li key={e.id} className="flex shrink-0 gap-2 whitespace-nowrap animate-fadein">
            <span className="text-muted">{fmtTime(e.t)}</span>
            <span style={{ color: ACTOR_COLOR[e.actor] }}>{ACTOR_LABEL[e.actor]}</span>
            <span>{e.text}</span>
          </li>
        ))}
      </ol>
    </footer>
  );
}
