import { useState } from "react";
import { PATH_CATALOG, TOOL_CATALOG } from "../data/catalogs";
import { actions, useStore } from "../sim/store";
import type { WorkerId, WorkflowEdit } from "../types";

const clampSteps = (n: number) => Math.min(20, Math.max(1, Math.round(Number.isFinite(n) ? n : 1)));

/** Bounded editors only. No free-form prompt. Remount with key={id}. */
export function WorkflowEditor({ id }: { id: WorkerId }) {
  const saved = useStore((s) => s.workflow[id]);
  const live = useStore((s) => s.sim.agents[id]);
  const [edit, setEdit] = useState<WorkflowEdit>(() => structuredClone(saved));
  const [custom, setCustom] = useState("");
  const dirty = JSON.stringify(edit) !== JSON.stringify(saved);

  const toggleTool = (t: string) =>
    setEdit((e) => ({ ...e, tools: e.tools.includes(t) ? e.tools.filter((x) => x !== t) : [...e.tools, t] }));
  const addPath = (p: string) => {
    const path = p.trim();
    if (path && !edit.paths.includes(path)) setEdit((e) => ({ ...e, paths: [...e.paths, path] }));
  };
  const removePath = (p: string) => setEdit((e) => ({ ...e, paths: e.paths.filter((x) => x !== p) }));

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded border border-line bg-panel2 px-2 py-1.5 text-[12px] text-muted">
        Workflow edits are bounds. They are not a new personality.
      </p>

      <fieldset>
        <legend className="panel-title mb-1.5">Tools</legend>
        <div className="grid grid-cols-2 gap-1">
          {TOOL_CATALOG.map((t) => (
            <label key={t} className="flex items-center gap-1.5 font-mono text-[12px]">
              <input type="checkbox" checked={edit.tools.includes(t)} onChange={() => toggleTool(t)} className="accent-policy" />
              {t}
            </label>
          ))}
        </div>
        {edit.tools.length === 0 && (
          <p className="mt-1.5 text-[12px] text-ask" role="alert">
            A worker with no tools cannot be dispatched.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="panel-title mb-1.5">Paths</legend>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {edit.paths.length === 0 && <span className="text-[12px] text-muted">No paths.</span>}
          {edit.paths.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 rounded border border-line bg-panel2 px-1.5 py-0.5 font-mono text-[11px]">
              {p}
              <button type="button" className="text-muted hover:text-deny" aria-label={`Remove ${p}`} onClick={() => removePath(p)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {PATH_CATALOG.filter((p) => !edit.paths.includes(p)).map((p) => (
            <button key={p} type="button" className="btn px-1.5 py-0.5 font-mono text-[11px]" onClick={() => addPath(p)}>
              + {p}
            </button>
          ))}
        </div>
        <form
          className="mt-1.5 flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            addPath(custom);
            setCustom("");
          }}
        >
          <label htmlFor={`custom-path-${id}`} className="sr-only">
            Custom path
          </label>
          <input
            id={`custom-path-${id}`}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="custom path, e.g. src/auth/"
            className="min-w-0 flex-1 rounded border border-line bg-panel2 px-1.5 py-1 font-mono text-[12px] focus:border-muted focus:outline-none"
          />
          <button type="submit" className="btn" disabled={!custom.trim()}>
            Add
          </button>
        </form>
      </fieldset>

      <label className="flex items-center justify-between gap-2">
        <span className="panel-title">Step limit</span>
        <input
          type="number"
          min={1}
          max={20}
          value={edit.stepLimit}
          onChange={(e) => setEdit((x) => ({ ...x, stepLimit: clampSteps(e.target.valueAsNumber) }))}
          className="w-16 rounded border border-line bg-panel2 px-1.5 py-1 text-right font-mono text-[12px]"
        />
      </label>
      <p className="font-mono text-[11px] text-muted">
        current run: {live.stepsUsed}/{live.stepLimit} steps ({Math.max(0, live.stepLimit - live.stepsUsed)} left, display-only)
      </p>

      <div className="flex items-center gap-2">
        <button type="button" className="btn border-policy/60" disabled={!dirty} onClick={() => actions.applyWorkflow(id, edit)}>
          Apply to next run
        </button>
        <span className="text-[11px] text-muted">{dirty ? "unsaved" : "saved · takes effect on Reset/Run"}</span>
      </div>
    </div>
  );
}
