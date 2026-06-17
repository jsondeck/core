/**
 * Recursively clones an arbitrary JSON-like value (plain objects, arrays, and
 * primitives). Used wherever a value of unknown shape must be isolated from its
 * source — e.g. cloning `timer.bind`, or the object/array a `$`-expression
 * resolves to before it is stored in state.
 */
export function deepCloneValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(deepCloneValue);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = deepCloneValue(val);
    }
    return out;
  }
  return value;
}
