import type { CompiledGame } from '../dsl/types.js';

/**
 * The full catalog of error/warning codes emitted by the runtime. Exposed as a
 * runtime object so consumers can reference codes without magic strings, e.g.
 * `if (err.code === JsonDeckErrorCodes.UNKNOWN_CARD) { ... }`.
 */
export const JsonDeckErrorCodes = {
  DSL_VALIDATION_ERROR: 'DSL_VALIDATION_ERROR',
  SEMANTIC_VALIDATION_ERROR: 'SEMANTIC_VALIDATION_ERROR',
  UNKNOWN_CARD_TYPE: 'UNKNOWN_CARD_TYPE',
  UNKNOWN_ZONE: 'UNKNOWN_ZONE',
  UNKNOWN_CARD: 'UNKNOWN_CARD',
  UNKNOWN_VARIABLE: 'UNKNOWN_VARIABLE',
  INVALID_VARIABLE_TYPE: 'INVALID_VARIABLE_TYPE',
  INVALID_COMMAND: 'INVALID_COMMAND',
  COMMAND_EXECUTION_ERROR: 'COMMAND_EXECUTION_ERROR',
  EXPRESSION_RESOLUTION_ERROR: 'EXPRESSION_RESOLUTION_ERROR',
  RULE_EXECUTION_ERROR: 'RULE_EXECUTION_ERROR',
  INVALID_EVENT: 'INVALID_EVENT',
  INVALID_TICK_DELTA: 'INVALID_TICK_DELTA',
  MAX_EVENT_DEPTH_EXCEEDED: 'MAX_EVENT_DEPTH_EXCEEDED',
  INVALID_STATE: 'INVALID_STATE',
} as const;

/** Union of all known error/warning codes. */
export type JsonDeckErrorCode = (typeof JsonDeckErrorCodes)[keyof typeof JsonDeckErrorCodes];

// `string & {}` keeps editor autocomplete for the known codes while still
// allowing forward-compatible unknown codes.
type ErrorCode = JsonDeckErrorCode | (string & {});

export interface JsonDeckError {
  code: ErrorCode;
  message: string;
  path?: string;
  details?: unknown;
}

export interface JsonDeckWarning {
  code: ErrorCode;
  message: string;
  path?: string;
}

/**
 * Thrown by `compileGame` when validation fails. Carries the full structured
 * error/warning lists; the `message` summarizes the first error for quick
 * diagnostics (e.g. in stack traces and logs).
 */
export class JsonDeckCompileError extends Error {
  readonly errors: JsonDeckError[];
  readonly warnings: JsonDeckWarning[];

  constructor(errors: JsonDeckError[], warnings: JsonDeckWarning[] = []) {
    super(JsonDeckCompileError.summarize(errors));
    this.name = 'JsonDeckCompileError';
    this.errors = errors;
    this.warnings = warnings;
    // Restore prototype chain for reliable `instanceof` across transpile targets.
    Object.setPrototypeOf(this, JsonDeckCompileError.prototype);
  }

  private static summarize(errors: JsonDeckError[]): string {
    const count = errors.length;
    const first = errors[0];
    if (!first) return 'Compilation failed';
    const where = first.path ? ` at ${first.path}` : '';
    const more = count > 1 ? ` (+${count - 1} more)` : '';
    return `Compilation failed: [${first.code}] ${first.message}${where}${more}`;
  }
}

export type CompileGameResult =
  | { ok: true; game: CompiledGame; warnings: JsonDeckWarning[] }
  | { ok: false; errors: JsonDeckError[]; warnings: JsonDeckWarning[] };
