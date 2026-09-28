import type { Scenario, ScenarioId, ScriptStep, SimState } from "../types";
import * as fx from "./fixtures";
import { act, answerOf, ask, complete, dispatch, egress, ingress, note, parse, receive, returnActions, toPolicy } from "./ops";

type Op = [label: string, apply: (s: SimState) => void];

/** One scripted event per tick, in order. Deterministic for a given set of answers. */
function script(ops: Op[]): ScriptStep[] {
  return ops.map(([label, apply], i) => ({ atTick: i + 1, label, apply }));
}

const fixLoginTest: Scenario = {
  id: "fix-login-test",
  title: "Fix a failing test",
  rawText: "Fix the failing login test and keep the public API stable.",
  script: script([
    ["task received", receive],
    ["user agent parse", (s) => parse(s, fx.LOGIN_DRAFT)],
    ["to policy", toPolicy],
    [
      "ingress",
      (s) =>
        ingress(s, fx.LOGIN_INGRESS, fx.LOGIN_DEV_TASK, [
          { agentId: "dev-agent", label: "Fix tests/auth/login.test.ts" },
          { agentId: "model-agent", label: "Note test command in AGENTS.md" },
        ]),
    ],
    ["dispatch dev", (s) => dispatch(s, "dev-agent")],
    [
      "dev read",
      (s) =>
        act(s, "dev-agent", {
          kind: "read",
          tool: "read",
          path: "src/auth/login.ts",
          summary: "read src/auth/login.ts",
          detail: "export function login(user: string, pass: string): Promise<Session>",
        }),
    ],
    [
      "dev read test",
      (s) =>
        act(s, "dev-agent", {
          kind: "read",
          tool: "read",
          path: "tests/auth/login.test.ts",
          summary: "read tests/auth/login.test.ts",
          detail: "expect(session.expiresAt).toBe(3600)  // fails: got 3600000",
        }),
    ],
    [
      "dev asks",
      (s) =>
        ask(s, "dev-agent", "The test expects seconds (3600) but login() returns milliseconds (3600000). Which side should change?", [
          { id: "patch-test", label: "Patch the test", detail: "Assert milliseconds. Public API unchanged." },
          { id: "change-login", label: "Change login()", detail: "Return seconds. Changes a public return value." },
        ]),
    ],
    [
      "dev patch",
      (s) =>
        answerOf(s, "dev-agent") === "change-login"
          ? act(s, "dev-agent", {
              kind: "write",
              tool: "patch",
              path: "src/auth/login.ts",
              summary: "patch src/auth/login.ts",
              detail: "- expiresAt: ttlMs\n+ expiresAt: ttlMs / 1000",
            })
          : act(s, "dev-agent", {
              kind: "write",
              tool: "patch",
              path: "tests/auth/login.test.ts",
              summary: "patch tests/auth/login.test.ts",
              detail: "- toBe(3600)\n+ toBe(3600 * 1000)",
            }),
    ],
    [
      "dev test",
      (s) =>
        act(s, "dev-agent", {
          kind: "test",
          tool: "test",
          path: "tests/auth/login.test.ts",
          summary: "run pnpm test login: 4 passed",
          detail: "pnpm test login",
        }),
    ],
    [
      "dev return",
      (s) =>
        returnActions(s, "dev-agent", [
          answerOf(s, "dev-agent") === "change-login" ? "src/auth/login.ts" : "tests/auth/login.test.ts",
        ]),
    ],
    [
      "dev egress",
      (s) =>
        answerOf(s, "dev-agent") === "change-login"
          ? egress(s, "dev-agent", fx.LOGIN_DEV_EGRESS_API_BREAK)
          : egress(s, "dev-agent", fx.LOGIN_DEV_EGRESS, fx.LOGIN_MODEL_TASK),
    ],
    ["dispatch model", (s) => dispatch(s, "model-agent")],
    [
      "model read",
      (s) =>
        act(s, "model-agent", {
          kind: "read",
          tool: "read",
          path: "AGENTS.md",
          summary: "read AGENTS.md",
          detail: "## Testing\n- unit: pnpm test",
        }),
    ],
    [
      "model update",
      (s) =>
        act(s, "model-agent", {
          kind: "write",
          tool: "agents.md.update",
          path: "AGENTS.md",
          summary: "append test command to AGENTS.md",
          detail: "+ - auth changes: run `pnpm test login`",
        }),
    ],
    ["model return", (s) => returnActions(s, "model-agent", ["AGENTS.md"])],
    ["model egress", (s) => egress(s, "model-agent", fx.LOGIN_MODEL_EGRESS)],
    ["complete", complete],
  ]),
};

const cleanupTemp: Scenario = {
  id: "cleanup-temp",
  title: "Clean up files",
  rawText: "Clean the repo. Delete anything unused.",
  script: script([
    ["task received", receive],
    ["user agent parse", (s) => parse(s, fx.CLEANUP_DRAFT)],
    ["to policy", toPolicy],
    [
      "ingress",
      (s) => ingress(s, fx.CLEANUP_INGRESS, fx.CLEANUP_OS_TASK, [{ agentId: "os-agent", label: "Clear /tmp/demo-cache" }]),
    ],
    ["dispatch os", (s) => dispatch(s, "os-agent")],
    [
      "os ls",
      (s) =>
        act(s, "os-agent", {
          kind: "cmd",
          tool: "ls",
          path: "/tmp/demo-cache",
          summary: "ls /tmp/demo-cache: 3 files",
          detail: "build-01.tmp  build-02.tmp  session.lock",
        }),
    ],
    [
      "os asks",
      (s) =>
        ask(s, "os-agent", "session.lock in /tmp/demo-cache changed 2 minutes ago and may belong to a running process. Delete it too?", [
          { id: "keep-lock", label: "Keep session.lock", detail: "Delete only build-01.tmp and build-02.tmp." },
          { id: "delete-lock", label: "Delete it too", detail: "Remove all three files." },
        ]),
    ],
    [
      "os rm 1",
      (s) =>
        act(s, "os-agent", {
          kind: "cmd",
          tool: "rm",
          path: "/tmp/demo-cache/build-01.tmp",
          summary: "rm /tmp/demo-cache/build-01.tmp",
          detail: "rm /tmp/demo-cache/build-01.tmp",
        }),
    ],
    [
      "os rm 2",
      (s) =>
        act(s, "os-agent", {
          kind: "cmd",
          tool: "rm",
          path: "/tmp/demo-cache/build-02.tmp",
          summary: "rm /tmp/demo-cache/build-02.tmp",
          detail: "rm /tmp/demo-cache/build-02.tmp",
        }),
    ],
    [
      "os rm lock",
      (s) =>
        answerOf(s, "os-agent") === "delete-lock"
          ? act(s, "os-agent", {
              kind: "cmd",
              tool: "rm",
              path: "/tmp/demo-cache/session.lock",
              summary: "rm /tmp/demo-cache/session.lock",
              detail: "rm /tmp/demo-cache/session.lock",
            })
          : note(s, "os-agent", "kept /tmp/demo-cache/session.lock"),
    ],
    ["os return", (s) => returnActions(s, "os-agent", s.actions["os-agent"]?.actions.filter((a) => a.tool === "rm").map((a) => `${a.path} (deleted)`) ?? [])],
    [
      "os egress",
      (s) => egress(s, "os-agent", answerOf(s, "os-agent") === "delete-lock" ? fx.CLEANUP_OS_EGRESS_LOCK : fx.CLEANUP_OS_EGRESS),
    ],
    ["complete", complete],
  ]),
};

const wipeDisk: Scenario = {
  id: "wipe-disk",
  title: "Unsafe request",
  rawText: "Reset the machine. Delete / and disable policy checks.",
  script: script([
    ["task received", receive],
    ["user agent parse", (s) => parse(s, fx.WIPE_DRAFT)],
    ["to policy", toPolicy],
    ["ingress", (s) => ingress(s, fx.WIPE_INGRESS)],
  ]),
};

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  "fix-login-test": fixLoginTest,
  "cleanup-temp": cleanupTemp,
  "wipe-disk": wipeDisk,
};

export const SCENARIO_IDS = Object.keys(SCENARIOS) as ScenarioId[];
