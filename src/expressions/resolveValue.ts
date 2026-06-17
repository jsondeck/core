import { JsonDeckWarning } from '../errors/types.js';
import { RUNTIME_LIMITS } from '../limits.js';
import { deepCloneValue } from '../util/clone.js';

export interface ResolveContext {
  source?: string;
  target?: unknown;
  position?: { x: number; y: number };
  timer?: unknown;
  event?: unknown;
  vars: Record<string, unknown>;
}

export interface ResolveResult {
  value: unknown;
  warnings: JsonDeckWarning[];
}

function getNestedValue(obj: unknown, path: string[]): [unknown, boolean] {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') {
      return [undefined, false];
    }
    current = (current as Record<string, unknown>)[key];
  }
  return [current, true];
}

export function resolveValue(input: unknown, context: ResolveContext): ResolveResult {
  const warnings: JsonDeckWarning[] = [];

  // Non-strings are literals
  if (typeof input !== 'string') {
    return { value: input, warnings };
  }

  // Strings not starting with $ are literals
  if (!input.startsWith('$')) {
    return { value: input, warnings };
  }

  // Expression path resolution
  const path = input.slice(1).split('.');
  const [firstKey, ...rest] = path;

  let value: unknown;
  let found = true;

  switch (firstKey) {
    case 'source':
      value = context.source;
      break;
    case 'target':
      value = context.target;
      break;
    case 'position':
      value = context.position;
      break;
    case 'timer':
      value = context.timer;
      break;
    case 'event':
      value = context.event;
      break;
    case 'vars':
      value = context.vars;
      break;
    default:
      found = false;
      warnings.push({
        code: 'EXPRESSION_RESOLUTION_ERROR',
        message: `Unknown root variable in expression: $${firstKey}`,
        path: input,
      });
      break;
  }

  if (!found) {
    return { value: undefined, warnings };
  }

  // Resolve nested path
  if (rest.length > 0) {
    const [nestedValue, nestedFound] = getNestedValue(value, rest);
    if (!nestedFound) {
      warnings.push({
        code: 'EXPRESSION_RESOLUTION_ERROR',
        message: `Cannot resolve expression: ${input}`,
        path: input,
      });
      return { value: undefined, warnings };
    }
    return { value: nestedValue, warnings };
  }

  return { value, warnings };
}

/**
 * Recursively resolves every `$`-expression found anywhere inside the input,
 * descending into nested objects and arrays. Non-expression values are returned
 * as-is. Used for `start_timer.bind` and `emit_event.payload` deep-resolution.
 */
export function deepResolve(input: unknown, context: ResolveContext): [unknown, JsonDeckWarning[]] {
  const warnings: JsonDeckWarning[] = [];
  let depthExceeded = false;

  const visit = (value: unknown, depth: number): unknown => {
    // Guard against adversarially deep payload/bind structures overflowing the
    // stack: beyond the limit, stop descending and keep the subtree verbatim.
    if (depth > RUNTIME_LIMITS.maxExpressionDepth) {
      if (!depthExceeded) {
        depthExceeded = true;
        warnings.push({
          code: 'EXPRESSION_RESOLUTION_ERROR',
          message: `Expression nesting exceeded maxExpressionDepth (${RUNTIME_LIMITS.maxExpressionDepth}); deeper values left unresolved`,
        });
      }
      return value;
    }
    if (typeof value === 'string') {
      if (value.startsWith('$')) {
        const resolved = resolveValue(value, context);
        warnings.push(...resolved.warnings);
        // The resolved value may be an object/array that aliases the live event
        // payload, vars, or timer snapshot. Clone it so the value stored in state
        // (e.g. timer.bind / emit_event payload) is fully isolated.
        return deepCloneValue(resolved.value);
      }
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((v) => visit(v, depth + 1));
    }
    if (value !== null && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        out[key] = visit(val, depth + 1);
      }
      return out;
    }
    return value;
  };

  return [visit(input, 0), warnings];
}

export function deepResolveRecord(
  obj: Record<string, unknown>,
  context: ResolveContext,
): [Record<string, unknown>, JsonDeckWarning[]] {
  const [resolved, warnings] = deepResolve(obj, context);
  return [resolved as Record<string, unknown>, warnings];
}
