let counter = 0;

/** Small local id helper. Deterministic within a session. */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString(36).padStart(4, "0")}`;
}
