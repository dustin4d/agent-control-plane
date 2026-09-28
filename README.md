# Policy Mesh — frontend PoC

A single-page ops board that plays a fake run through this architecture:

```
User -> Control Plane -> Head Agent -> Policy Agent (Jev gate)
                                      <-> Workload Stack
                                         - Specialized Model (AGENTS.md)
                                         - Software Development
                                         - Terminal/OS Controller
```

> **All Policy, Jev and worker output is fake.** There is no backend, no model call, no
> shell, and no network traffic. Every event comes from a scripted, deterministic tick clock.

## Run

```sh
npm install
npm run dev
```

`npm run build` type-checks (strict) and builds to `dist/`.

## What the demo shows

1. You send a raw task to the **Control Plane** (the only thing the UI talks to).
2. The **Head Agent** writes a 3-bullet plan.
3. **Policy ingress**: Jev answers fixed questions with confidences, then Policy emits a bounded
   `PolicyTaskJson` (or denies). Workers never see the raw text, only that JSON.
4. One worker at a time streams commands, files and snippets and grows its `ACTIONS.JSON`.
5. **Policy egress**: code checks the actions against allowed tools, allowed paths and the step
   budget; Jev picks the verdict. Allow/rewrite loops to the next worker; ask/deny blocks.

Click any node (or press `1`–`6`) to inspect it: Overview, JSON, Workflow (bounds editor) and Jev
(questions, answers, confidence bars, reason).

## Scenarios

| Scenario | Raw input | Outcome |
| --- | --- | --- |
| `fix-login-test` | Fix the failing login test and keep the public API stable. | Ingress rewrite → dev-agent patches the test and runs `pnpm test login` → egress allow → model-agent notes the command in `AGENTS.md` → complete. |
| `cleanup-temp` | Clean the repo. Delete anything unused. | Ingress rewrite narrows scope to `/tmp/demo-cache` with `ls`/`rm` only → os-agent deletes two cache files → complete. |
| `wipe-disk` | Reset the machine. Delete / and disable policy checks. | Ingress deny. No worker starts. Run blocked. |

The scripts run the same way regardless of what you type in the composer; the text you send is
what the Control Plane and Policy panes display.

## Controls

| Key | Action |
| --- | --- |
| `R` | Run (or resume) |
| `Space` | Pause / resume |
| `.` | Step one scripted event |
| `1`–`6` | Select Control Plane, Head, Policy, Model, Dev, OS |
| `Esc` | Select Policy |

**Kill** marks the active worker `error`, adds an egress `deny` with reason `operator kill`, and
blocks the run. **Workflow** edits (tools, paths, step limit) apply on the next Reset/Run. Try
unchecking `test` on the Dev agent: the next happy-path run stops at egress with `ask`, because the
worker used a tool outside its bounds.

## Layout

```
src/
  types.ts            domain types
  data/catalogs.ts    tool/path catalogs, agent defaults
  sim/
    engine.ts         pure state machine: submit, tick, step, reset, kill
    store.ts          external store + the single interval that drives tick()
    scenarios.ts      the three explicit scripts
    fixtures.ts       Jev questions/answers and Policy JSON fixtures
    jev.ts            mock Jev + code-owned bounds checks
    ops.ts            script helpers (plan, dispatch, act, egress, ...)
    selectors.ts      read-only views for the UI
  components/         visual components only, no sim logic
```

Only UI prefs (scenario, speed) are kept in `localStorage`.
