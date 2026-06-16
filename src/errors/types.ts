export interface JsonDeckError {
  code: string;
  message: string;
  path?: string;
  details?: unknown;
}

export interface JsonDeckWarning {
  code: string;
  message: string;
  path?: string;
}

export class JsonDeckCompileError extends Error {
  readonly name = 'JsonDeckCompileError';

  constructor(
    readonly errors: JsonDeckError[],
    readonly warnings: JsonDeckWarning[] = [],
  ) {
    const message = `Compilation failed with ${errors.length} error(s)`;
    super(message);
  }
}

export type CompileGameResult =
  | { ok: true; game: any; warnings: JsonDeckWarning[] }
  | { ok: false; errors: JsonDeckError[]; warnings: JsonDeckWarning[] };
