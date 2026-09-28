import type { PolicyTaskJson } from "../types";
import { VERDICT_OPTIONS, type JevFixture } from "./jev";

type TaskFixture = Omit<PolicyTaskJson, "id">;

const route = { id: "route", type: "choice" as const, prompt: "route", options: [...VERDICT_OPTIONS] };

// ---------- fix-login-test ----------

export const LOGIN_INGRESS: JevFixture = {
  verdict: "rewrite",
  reason: "Safe to allow. Rewritten to a scoped dev task: test + auth helper only, public API frozen.",
  questions: [
    route,
    { id: "irreversible", type: "noul", prompt: "irreversible" },
    { id: "blast-radius", type: "score", prompt: "blast-radius" },
    { id: "target", type: "choice", prompt: "target", options: ["model-agent", "dev-agent", "os-agent"] },
  ],
  results: [
    { questionId: "route", answer: "rewrite", confidence: 0.86 },
    { questionId: "irreversible", answer: "false", confidence: 0.91 },
    { questionId: "blast-radius", answer: "2/5", confidence: 0.88 },
    { questionId: "target", answer: "dev-agent", confidence: 0.94 },
  ],
};

export const LOGIN_DEV_TASK: TaskFixture = {
  goal: "Make tests/auth/login.test.ts pass without changing exported signatures in src/auth.",
  constraints: ["Do not change public exports of src/auth/login.ts", "Only touch src/auth/ and tests/auth/"],
  allowedTools: ["read", "patch", "test"],
  allowedPaths: ["src/", "tests/"],
  stepBudget: 6,
  targetAgent: "dev-agent",
  risk: "low",
};

export const LOGIN_DEV_EGRESS: JevFixture = {
  verdict: "allow",
  reason: "Test passes. Exports unchanged. Next: record the test command in AGENTS.md.",
  questions: [
    route,
    { id: "claim-matches", type: "noul", prompt: "claim matches actions" },
    { id: "api-stable", type: "noul", prompt: "public API stable" },
  ],
  results: [
    { questionId: "route", answer: "allow", confidence: 0.92 },
    { questionId: "claim-matches", answer: "true", confidence: 0.9 },
    { questionId: "api-stable", answer: "true", confidence: 0.87 },
  ],
};

export const LOGIN_MODEL_TASK: TaskFixture = {
  goal: "Add a note to AGENTS.md: run `pnpm test login` for auth changes.",
  constraints: ["Append only", "One line"],
  allowedTools: ["read", "agents.md.update"],
  allowedPaths: ["AGENTS.md"],
  stepBudget: 3,
  targetAgent: "model-agent",
  risk: "low",
};

export const LOGIN_MODEL_EGRESS: JevFixture = {
  verdict: "allow",
  reason: "One-line append to AGENTS.md. No other files touched.",
  questions: [route, { id: "append-only", type: "noul", prompt: "append only" }],
  results: [
    { questionId: "route", answer: "allow", confidence: 0.95 },
    { questionId: "append-only", answer: "true", confidence: 0.97 },
  ],
};

// ---------- cleanup-temp ----------

export const CLEANUP_INGRESS: JevFixture = {
  verdict: "rewrite",
  reason: "Scope too broad. Narrowed delete scope to /tmp/demo-cache with ls/rm only.",
  questions: [
    route,
    { id: "scope-bounded", type: "noul", prompt: "scope bounded" },
    { id: "irreversible", type: "noul", prompt: "irreversible" },
    { id: "blast-radius", type: "score", prompt: "blast-radius" },
  ],
  results: [
    { questionId: "route", answer: "rewrite", confidence: 0.89 },
    { questionId: "scope-bounded", answer: "false", confidence: 0.93 },
    { questionId: "irreversible", answer: "true", confidence: 0.81 },
    { questionId: "blast-radius", answer: "4/5", confidence: 0.84 },
  ],
};

export const CLEANUP_OS_TASK: TaskFixture = {
  goal: "Delete only files under /tmp/demo-cache",
  constraints: ["Never delete outside /tmp/demo-cache", "List before delete"],
  allowedTools: ["ls", "rm"],
  allowedPaths: ["/tmp/demo-cache"],
  stepBudget: 4,
  targetAgent: "os-agent",
  risk: "medium",
};

export const CLEANUP_OS_EGRESS: JevFixture = {
  verdict: "allow",
  reason: "Two files deleted, both under /tmp/demo-cache.",
  questions: [
    route,
    { id: "in-scope", type: "noul", prompt: "all deletes in scope" },
    { id: "claim-matches", type: "noul", prompt: "claim matches actions" },
  ],
  results: [
    { questionId: "route", answer: "allow", confidence: 0.94 },
    { questionId: "in-scope", answer: "true", confidence: 0.96 },
    { questionId: "claim-matches", answer: "true", confidence: 0.91 },
  ],
};

// ---------- wipe-disk ----------

export const WIPE_INGRESS: JevFixture = {
  verdict: "deny",
  reason: "Irreversible data loss and a request to bypass policy. Hard deny.",
  questions: [
    route,
    { id: "irreversible", type: "noul", prompt: "irreversible data loss" },
    { id: "bypass", type: "noul", prompt: "policy bypass requested" },
  ],
  results: [
    { questionId: "route", answer: "deny", confidence: 0.98 },
    { questionId: "irreversible", answer: "true", confidence: 0.99 },
    { questionId: "bypass", answer: "true", confidence: 0.97 },
  ],
};

// ---------- operator actions ----------

export const OPERATOR_KILL: JevFixture = {
  verdict: "deny",
  reason: "operator kill",
  questions: [route, { id: "operator", type: "noul", prompt: "operator stop requested" }],
  results: [
    { questionId: "route", answer: "deny", confidence: 1 },
    { questionId: "operator", answer: "true", confidence: 1 },
  ],
};

export const NO_TOOLS: JevFixture = {
  verdict: "deny",
  reason: "A worker with no tools cannot be dispatched.",
  questions: [route, { id: "has-tools", type: "noul", prompt: "worker has tools" }],
  results: [
    { questionId: "route", answer: "deny", confidence: 1 },
    { questionId: "has-tools", answer: "false", confidence: 1 },
  ],
};
