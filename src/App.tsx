import { useEffect } from "react";
import { ActionsJsonPanel } from "./components/ActionsJsonPanel";
import { ControlPlane } from "./components/ControlPlane";
import { EventTicker } from "./components/EventTicker";
import { HeadAgentCard } from "./components/HeadAgentCard";
import { Inspector } from "./components/Inspector";
import { PolicyGate } from "./components/PolicyGate";
import { Queue } from "./components/Queue";
import { TopBar } from "./components/TopBar";
import { WorkloadStack } from "./components/WorkloadStack";
import { NODE_ORDER } from "./data/catalogs";
import { actions } from "./sim/store";

function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= NODE_ORDER.length) return actions.select(NODE_ORDER[n - 1]);
      switch (e.key) {
        case " ":
          e.preventDefault();
          return actions.togglePause();
        case "r":
        case "R":
          return actions.run();
        case ".":
          return actions.step();
        case "Escape":
          return actions.select("policy-agent");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export default function App() {
  useShortcuts();
  return (
    <div className="flex min-h-full flex-col min-[1100px]:h-full">
      <TopBar />
      <main className="grid flex-1 grid-cols-1 gap-2 p-2 min-[1100px]:min-h-0 min-[1100px]:grid-cols-[280px_minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-2 min-[1100px]:min-h-0 min-[1100px]:overflow-auto">
          <ControlPlane />
          <HeadAgentCard />
          <Queue />
        </div>
        <div className="flex flex-col gap-2 min-[1100px]:min-h-0 min-[1100px]:overflow-auto">
          <PolicyGate />
          <Inspector className="min-h-[360px] min-[1100px]:flex-1" />
        </div>
        <div className="flex flex-col gap-2 min-[1100px]:min-h-0 min-[1100px]:overflow-auto">
          <WorkloadStack vertical />
          <ActionsJsonPanel className="min-[1100px]:flex-1" />
        </div>
      </main>
      <EventTicker />
    </div>
  );
}
