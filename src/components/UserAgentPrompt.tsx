import { useEffect, useState } from "react";
import { SCENARIOS, SCENARIO_IDS } from "../sim/scenarios";
import { runSummary } from "../sim/selectors";
import { actions, useStore } from "../sim/store";
import type { SimState } from "../types";

/** True for a moment each time the shake counter bumps. */
function useShake(counter: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (counter === 0) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 450);
    return () => clearTimeout(t);
  }, [counter]);
  return on;
}

function statusLine(sim: SimState): { text: string; tone: string } {
  const ua = sim.agents["user-agent"];
  switch (sim.status) {
    case "idle":
      return { text: "Ready. The User Agent turns your instructions into JSON for Policy.", tone: "text-muted" };
    case "running":
      return { text: ua.status === "done" ? "Task JSON is with Policy and the workload agents." : ua.snippet || "Sending", tone: "text-user" };
    case "waiting-user":
      return { text: "A workload agent needs a decision from you.", tone: "text-ask" };
    case "complete": {
      const { workers, decisions } = runSummary(sim);
      return {
        text: `Done. ${workers} task${workers === 1 ? "" : "s"} completed, ${decisions} decision${decisions === 1 ? "" : "s"} made.`,
        tone: "text-allow",
      };
    }
    case "blocked":
      return { text: "Stopped. See Policy warnings.", tone: "text-deny" };
  }
}

export function UserAgentPrompt() {
  const sim = useStore((s) => s.sim);
  const draft = useStore((s) => s.draft);
  const shaking = useShake(useStore((s) => s.shake));
  const live = sim.status === "running" || sim.status === "waiting-user";
  const line = statusLine(sim);

  return (
    <section className="panel flex flex-col gap-2.5 p-3" aria-labelledby="ua-title">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-user" aria-hidden />
        <h2 id="ua-title" className="panel-title text-user">
          User Agent
        </h2>
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          actions.send();
        }}
      >
        <label htmlFor="prompt" className="sr-only">
          Instructions for the User Agent
        </label>
        <textarea
          id="prompt"
          rows={4}
          value={draft}
          disabled={live}
          onChange={(e) => actions.setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              actions.send();
            }
          }}
          placeholder="Describe the task in plain language. Policy checks it before any agent sees it."
          className={`resize-none rounded border bg-panel2 p-2.5 text-[13px] leading-snug text-ink placeholder:text-muted/70 focus:border-muted focus:outline-none disabled:opacity-60 ${
            shaking ? "animate-shake border-deny" : "border-line"
          }`}
        />
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            // Distinct keys: reusing one element would let the Stop click submit the form once it swaps.
            <button key="stop" type="button" className="btn border-deny/60 text-deny" onClick={actions.stop}>
              ■ Stop
            </button>
          ) : (
            <button key="send" type="submit" className="btn border-user/60 bg-user/15">
              Send to User Agent
            </button>
          )}
          <span className="text-[11px] text-muted">Ctrl/⌘ + Enter</span>
          <div className="ml-auto flex flex-wrap items-center gap-1" aria-label="Example prompts">
            <span className="text-[11px] text-muted">Examples:</span>
            {SCENARIO_IDS.map((id) => (
              <button
                key={id}
                type="button"
                disabled={live}
                onClick={() => actions.useExample(id)}
                className={`btn px-1.5 py-0.5 text-[11px] ${sim.scenarioId === id ? "border-user/60" : ""}`}
                title={SCENARIOS[id].rawText}
              >
                {SCENARIOS[id].title}
              </button>
            ))}
          </div>
        </div>
      </form>
      <p className={`text-[12px] ${line.tone}`} role="status">
        {line.text}
      </p>
    </section>
  );
}
