import { useSyncExternalStore } from "react";
import type { ScenarioId, SimState } from "../types";
import * as engine from "./engine";
import { SCENARIOS } from "./scenarios";

export const TICK_MS = 700;

export interface UiState {
  sim: SimState;
  draft: string;
  /** Bumped to replay the prompt box shake. */
  shake: number;
}

const PREFS_KEY = "policy-mesh-prefs";

function loadScenario(): ScenarioId {
  try {
    const id = (JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as { scenarioId?: string }).scenarioId;
    if (id && id in SCENARIOS) return id as ScenarioId;
  } catch {
    // prefs are optional
  }
  return "fix-login-test";
}

function saveScenario(scenarioId: ScenarioId): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ scenarioId }));
  } catch {
    // prefs are optional
  }
}

const initialScenario = loadScenario();
let state: UiState = {
  sim: engine.initialState(initialScenario),
  draft: SCENARIOS[initialScenario].rawText,
  shake: 0,
};

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function set(patch: Partial<UiState>): void {
  state = { ...state, ...patch };
  syncTimer();
  listeners.forEach((l) => l());
}

/** The only interval in the app. It drives engine.tick() while the run is live. */
function syncTimer(): void {
  const running = state.sim.status === "running";
  if (running && timer === undefined) {
    timer = setInterval(() => set({ sim: engine.tick(state.sim) }), TICK_MS);
  } else if (!running && timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(select: (s: UiState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

const isLive = (s: SimState) => s.status === "running" || s.status === "waiting-user";

export const actions = {
  /** Load an example prompt. Also picks which scripted run plays. */
  useExample(id: ScenarioId): void {
    if (isLive(state.sim)) return;
    saveScenario(id);
    set({ sim: engine.initialState(id), draft: SCENARIOS[id].rawText });
  },
  setDraft(draft: string): void {
    set({ draft });
  },
  /** Send the prompt to the User Agent. Starts a fresh run if the last one finished. */
  send(): void {
    const { sim, draft } = state;
    if (isLive(sim)) return;
    if (!draft.trim()) return set({ shake: state.shake + 1 });
    const base = sim.status === "idle" ? sim : engine.initialState(sim.scenarioId);
    set({ sim: engine.submit(base, draft) });
  },
  stop(): void {
    set({ sim: engine.stop(state.sim) });
  },
  answer(questionId: string, optionId: string): void {
    set({ sim: engine.answer(state.sim, questionId, optionId) });
  },
};
