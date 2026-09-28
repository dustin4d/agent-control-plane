import { useSyncExternalStore } from "react";
import { DEFAULT_WORKFLOW } from "../data/catalogs";
import type { AgentId, ScenarioId, SimState, WorkerId, WorkflowEdit } from "../types";
import * as engine from "./engine";
import { SCENARIOS } from "./scenarios";

export const BASE_TICK_MS = 700;
export const SPEEDS = [0.5, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];
export type InspectorTab = "Overview" | "JSON" | "Workflow" | "Jev";

export interface UiState {
  sim: SimState;
  draft: string;
  speed: Speed;
  selected: AgentId | null;
  tab: InspectorTab;
  /** Bounds applied on the next Reset/Run. Session only. */
  workflow: Record<WorkerId, WorkflowEdit>;
  /** Bumped to replay the composer shake. */
  shake: number;
}

const PREFS_KEY = "policy-mesh-prefs";

interface Prefs {
  scenarioId: ScenarioId;
  speed: Speed;
}

function loadPrefs(): Prefs {
  const fallback: Prefs = { scenarioId: "fix-login-test", speed: 1 };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      scenarioId: p.scenarioId && p.scenarioId in SCENARIOS ? p.scenarioId : fallback.scenarioId,
      speed: SPEEDS.find((s) => s === p.speed) ?? fallback.speed,
    };
  } catch {
    return fallback;
  }
}

function savePrefs(state: UiState): void {
  try {
    const prefs: Prefs = { scenarioId: state.sim.scenarioId, speed: state.speed };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // prefs are optional
  }
}

const cloneWorkflow = (w: Record<WorkerId, WorkflowEdit>): Record<WorkerId, WorkflowEdit> => structuredClone(w);

const prefs = loadPrefs();
let state: UiState = {
  sim: engine.initialState(prefs.scenarioId, DEFAULT_WORKFLOW),
  draft: SCENARIOS[prefs.scenarioId].rawText,
  speed: prefs.speed,
  selected: null,
  tab: "Overview",
  workflow: cloneWorkflow(DEFAULT_WORKFLOW),
  shake: 0,
};

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function set(patch: Partial<UiState>): void {
  const prev = state;
  state = { ...state, ...patch };
  if (prev.sim.scenarioId !== state.sim.scenarioId || prev.speed !== state.speed) savePrefs(state);
  syncTimer(prev);
  listeners.forEach((l) => l());
}

/** The only interval in the app. It drives engine.tick(). */
function syncTimer(prev: UiState): void {
  const running = state.sim.status === "running";
  const wasRunning = prev.sim.status === "running" && timer !== undefined;
  if (running && wasRunning && prev.speed === state.speed) return;
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  if (running) {
    timer = setInterval(() => set({ sim: engine.tick(state.sim) }), BASE_TICK_MS / state.speed);
  }
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(select: (s: UiState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

const freshSim = (): SimState => engine.reset(state.sim, state.workflow);

export const actions = {
  setScenario(id: ScenarioId): void {
    set({ sim: engine.initialState(id, state.workflow, state.sim.inputHistory), draft: SCENARIOS[id].rawText });
  },
  setDraft(draft: string): void {
    set({ draft });
  },
  setSpeed(speed: Speed): void {
    set({ speed });
  },
  select(selected: AgentId | null): void {
    set({ selected });
  },
  setTab(tab: InspectorTab): void {
    set({ tab });
  },
  /** Send to Head Agent. Also: resume when paused, restart when finished. */
  run(): void {
    const { sim, draft } = state;
    if (sim.status === "paused") return set({ sim: engine.setPaused(sim, false) });
    if (sim.status === "running") return;
    if (!draft.trim()) return set({ shake: state.shake + 1 });
    const base = sim.status === "idle" ? sim : freshSim();
    set({ sim: engine.submit(base, draft) });
  },
  togglePause(): void {
    const { sim } = state;
    if (sim.status === "running") set({ sim: engine.setPaused(sim, true) });
    else if (sim.status === "paused") set({ sim: engine.setPaused(sim, false) });
  },
  step(): void {
    const { sim, draft } = state;
    if (sim.status === "running" || sim.status === "paused") return set({ sim: engine.step(sim) });
    if (!draft.trim()) return set({ shake: state.shake + 1 });
    const base = sim.status === "idle" ? sim : freshSim();
    set({ sim: engine.step(engine.submit(base, draft, "paused")) });
  },
  reset(): void {
    set({ sim: freshSim() });
  },
  kill(): void {
    set({ sim: engine.kill(state.sim) });
  },
  applyWorkflow(id: WorkerId, edit: WorkflowEdit): void {
    set({ workflow: { ...state.workflow, [id]: structuredClone(edit) } });
  },
};
