/**
 * Hard runtime limits that bound work performed on untrusted game definitions
 * and events, preventing pathological inputs from hanging the host or
 * overflowing the stack. These are intentionally generous for legitimate games.
 *
 * They are exported so integrators can document/assert their own DSL budgets;
 * the values themselves are fixed for a given release.
 */
export const RUNTIME_LIMITS = {
  /** Max depth of an `emit_event` follow-up chain handled in one dispatch. */
  maxEventDepth: 32,
  /** Max nesting depth resolved inside `start_timer.bind` / `emit_event.payload`. */
  maxExpressionDepth: 64,
} as const;

export type RuntimeLimits = typeof RUNTIME_LIMITS;
