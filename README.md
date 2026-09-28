# Policy Mesh — frontend PoC

A single-page console that plays a fake run through this architecture:

```
User -> Control Plane -> User Agent -> Policy Agent (Jev gate)
                                      <-> Workload Stack
                                         - Specialized Model (AGENTS.md)
                                         - Software Development
                                         - Terminal/OS Controller
```

The **User Agent** parses plain-language instructions into policy-compatible JSON. That JSON goes to
the **Policy Agent**, which checks it, rewrites or denies it, and only then routes bounded task JSON
to the workload agents. Workers never see your raw text.

> **All Policy, Jev and worker output is fake.** There is no backend, no model call, no
> shell, and no network traffic. Every event comes from a scripted, deterministic tick clock.

## Run

```sh
npm install
npm run dev
```

`npm run build` type-checks (strict) and builds to `dist/`.

## What the UI shows

Only four things:

1. **User Agent**: the prompt box. Type instructions and press **Send to User Agent** (or
   Ctrl/⌘+Enter). **Stop** ends a live run.
2. **Policy warnings**: every Policy decision that was not a plain `allow`, before dispatch
   (ingress) or after the agent's work (egress). A rewrite lists what Policy changed from the User
   Agent's JSON (goal, tools, paths, step budget, constraints).
3. **Task queue**: the tasks Policy accepted, which workload agent each is routed to, and its status.
4. **Decisions needed**: questions from workload agents that need your choice before they can
   continue. The run holds until you answer.

## Scenarios

The **Examples** buttons load a prompt and pick which scripted run plays. Editing the text changes
what is sent, not the script.

| Example | Prompt | What happens |
| --- | --- | --- |
| Fix a failing test | Fix the failing login test and keep the public API stable. | Policy rewrites the task for the Dev agent. Dev asks whether to patch the test or change `login()`. **Patch the test** → Policy allows → Model agent notes the test command in `AGENTS.md` → done. **Change login()** → Policy denies at egress (public API changed). |
| Clean up files | Clean the repo. Delete anything unused. | Policy narrows the task to `/tmp/demo-cache` with `ls`/`rm` only. The OS agent asks whether to delete a recently used `session.lock`. Either answer completes. |
| Unsafe request | Reset the machine. Delete / and disable policy checks. | Policy denies before dispatch. Nothing is queued. |

## Layout

```
src/
  types.ts            domain types
  data/catalogs.ts    agent metadata and per-worker bounds
  sim/
    engine.ts         pure state machine: submit, tick, answer, stop
    store.ts          external store + the single interval that drives tick()
    scenarios.ts      the three explicit scripts
    fixtures.ts       User Agent JSON, Jev questions/answers and Policy JSON fixtures
    jev.ts            mock Jev + code-owned bounds checks
    ops.ts            script helpers (parse, ingress, dispatch, act, ask, egress, ...)
    selectors.ts      read-only views for the UI
  components/         the four panels, no sim logic
```

Only the last chosen example is kept in `localStorage`.
