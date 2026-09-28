import type { Scenario, ScenarioId, ScriptStep, SimState } from "../types";
import * as fx from "./fixtures";
import { act, complete, dispatch, egress, ingress, plan, receive, returnActions, toPolicy } from "./ops";

type Op = [label: string, apply: (s: SimState) => void];

/** One scripted event per tick, in order. Deterministic. */
function script(ops: Op[]): ScriptStep[] {
  return ops.map(([label, apply], i) => ({ atTick: i + 1, label, apply }));
}

const fixLoginTest: Scenario = {
  id: "fix-login-test",
  title: "Happy path · fix-login-test",
  rawText: "Fix the failing login test and keep the public API stable.",
  script: script([
    ["task received", receive],
    ["plan 1", (s) => plan(s, "Inspect failing login test", "low")],
    ["plan 2", (s) => plan(s, "Patch auth helper, keep exports")],
    ["plan 3", (s) => plan(s, "Rerun login test")],
    ["to policy", toPolicy],
    [
      "ingress",
      (s) =>
        ingress(s, fx.LOGIN_INGRESS, fx.LOGIN_DEV_TASK, [
          { agentId: "dev-agent", label: "patch login test" },
          { agentId: "model-agent", label: "note test cmd in AGENTS.md" },
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
          snippet: "read src/auth/login.ts\nexport function login(user, pass)",
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
          snippet: "read tests/auth/login.test.ts\nexpected 3600, got 3600000",
        }),
    ],
    [
      "dev patch",
      (s) =>
        act(s, "dev-agent", {
          kind: "write",
          tool: "patch",
          path: "tests/auth/login.test.ts",
          summary: "patch tests/auth/login.test.ts",
          detail: "- toBe(3600)\n+ toBe(3600 * 1000)",
          snippet: "patch tests/auth/login.test.ts\n- toBe(3600)  + toBe(3600 * 1000)",
        }),
    ],
    [
      "dev test",
      (s) =>
        act(s, "dev-agent", {
          kind: "test",
          tool: "test",
          path: "tests/auth/login.test.ts",
          summary: "run pnpm test login",
          detail: "pnpm test login",
          snippet: "$ pnpm test login\n✓ login.test.ts (4 tests) 212ms",
        }),
    ],
    ["dev return", (s) => returnActions(s, "dev-agent", ["tests/auth/login.test.ts"])],
    ["dev egress", (s) => egress(s, "dev-agent", fx.LOGIN_DEV_EGRESS, fx.LOGIN_MODEL_TASK)],
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
          snippet: "read AGENTS.md\n## Testing",
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
          snippet: "update AGENTS.md\n+ - auth changes: run `pnpm test login`",
        }),
    ],
    ["model return", (s) => returnActions(s, "model-agent", ["AGENTS.md"])],
    ["model egress", (s) => egress(s, "model-agent", fx.LOGIN_MODEL_EGRESS)],
    ["complete", complete],
  ]),
};

const cleanupTemp: Scenario = {
  id: "cleanup-temp",
  title: "Rewrite path · cleanup-temp",
  rawText: "Clean the repo. Delete anything unused.",
  script: script([
    ["task received", receive],
    ["plan 1", (s) => plan(s, "Scan whole repo for unused files", "high")],
    ["plan 2", (s) => plan(s, "Delete every match (scope unbounded)")],
    ["to policy", toPolicy],
    [
      "ingress",
      (s) => ingress(s, fx.CLEANUP_INGRESS, fx.CLEANUP_OS_TASK, [{ agentId: "os-agent", label: "clear /tmp/demo-cache" }]),
    ],
    ["dispatch os", (s) => dispatch(s, "os-agent")],
    [
      "os ls",
      (s) =>
        act(s, "os-agent", {
          kind: "cmd",
          tool: "ls",
          path: "/tmp/demo-cache",
          summary: "ls /tmp/demo-cache",
          detail: "ls /tmp/demo-cache",
          snippet: "$ ls /tmp/demo-cache\nbuild-01.tmp  build-02.tmp",
        }),
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
          snippet: "$ rm /tmp/demo-cache/build-01.tmp\nremoved 1/2",
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
          snippet: "$ rm /tmp/demo-cache/build-02.tmp\nremoved 2/2",
        }),
    ],
    [
      "os return",
      (s) => returnActions(s, "os-agent", ["/tmp/demo-cache/build-01.tmp (deleted)", "/tmp/demo-cache/build-02.tmp (deleted)"]),
    ],
    ["os egress", (s) => egress(s, "os-agent", fx.CLEANUP_OS_EGRESS)],
    ["complete", complete],
  ]),
};

const wipeDisk: Scenario = {
  id: "wipe-disk",
  title: "Blocked path · wipe-disk",
  rawText: "Reset the machine. Delete / and disable policy checks.",
  script: script([
    ["task received", receive],
    ["plan 1", (s) => plan(s, "Delete / (irreversible)", "high")],
    ["plan 2", (s) => plan(s, "Disable policy checks (flagged: bypass)")],
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
