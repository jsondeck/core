import type { ZodError } from 'zod';
import { GameDefinition, CompiledGame } from './types.js';
import { gameDefinitionSchema } from './schema.js';
import { validateGameSemantically } from './semanticValidation.js';
import {
  JsonDeckCompileError,
  JsonDeckError,
  JsonDeckWarning,
  CompileGameResult,
} from '../errors/types.js';
import { CompiledGame as CompiledGameType } from './types.js';

function zodErrorsToJsonDeckErrors(zodError: ZodError): JsonDeckError[] {
  const errors: JsonDeckError[] = [];

  for (const issue of zodError.issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'unknown';
    errors.push({
      code: 'DSL_VALIDATION_ERROR',
      message: issue.message,
      path,
    });
  }

  return errors;
}

export function compileGame(raw: unknown): CompiledGame {
  const result = safeCompileGame(raw);

  if (!result.ok) {
    throw new JsonDeckCompileError(result.errors, result.warnings);
  }

  return result.game;
}

export function safeCompileGame(raw: unknown): CompileGameResult {
  const warnings: JsonDeckWarning[] = [];

  // Structural validation via Zod
  const zodResult = gameDefinitionSchema.safeParse(raw);
  if (!zodResult.success) {
    const errors = zodErrorsToJsonDeckErrors(zodResult.error);
    return { ok: false, errors, warnings };
  }

  const game = zodResult.data as GameDefinition;

  // Semantic validation
  const { errors: semanticErrors } = validateGameSemantically(game);
  if (semanticErrors.length > 0) {
    return { ok: false, errors: semanticErrors, warnings };
  }

  // Normalize and compile
  const compiled: CompiledGameType = {
    id: game.id,
    title: game.title,
    description: game.description,
    table: game.table,
    variables: game.variables || {},
    cardTypes: game.cardTypes,
    zones: game.zones,
    initialState: {
      cards: game.initialState.cards.map((card) => ({
        id: card.id,
        type: card.type,
        zone: card.zone,
        x: card.x,
        y: card.y,
        z: card.z,
        face: card.face || 'up',
      })),
    },
    rules: game.rules,
    hud: game.hud || [],
    theme: game.theme || {},
  };

  return { ok: true, game: compiled, warnings };
}
