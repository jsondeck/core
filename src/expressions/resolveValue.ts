import { JsonDeckWarning } from '../errors/types.js';

export interface ResolveContext {
  source?: string;
  target?: any;
  position?: { x: number; y: number };
  timer?: any;
  event?: any;
  vars: Record<string, unknown>;
}

export interface ResolveResult {
  value: unknown;
  warnings: JsonDeckWarning[];
}

function getNestedValue(obj: any, path: string[]): [unknown, boolean] {
  let current = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') {
      return [undefined, false];
    }
    current = (current as Record<string, any>)[key];
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

export function deepResolveRecord(
  obj: Record<string, unknown>,
  context: ResolveContext,
): [Record<string, unknown>, JsonDeckWarning[]] {
  const warnings: JsonDeckWarning[] = [];
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && val.startsWith('$')) {
      const { value, warnings: valWarnings } = resolveValue(val, context);
      result[key] = value;
      warnings.push(...valWarnings);
    } else {
      result[key] = val;
    }
  }

  return [result, warnings];
}
