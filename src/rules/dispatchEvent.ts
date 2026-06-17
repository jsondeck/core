import { CompiledGame } from '../dsl/types.js';
import { GameState, GameEvent } from '../model/types.js';
import { DispatchResult, ExecutedCommandRecord } from '../runtime/types.js';
import { JsonDeckError, JsonDeckWarning } from '../errors/types.js';
import { evaluateCondition } from './evaluateCondition.js';
import { executeCommand } from '../commands/executeCommand.js';
import { createEventContext } from '../events/createEventContext.js';
import { validateEvent } from './validateEvent.js';
import { deepCloneState } from './deepClone.js';
import { RUNTIME_LIMITS } from '../limits.js';

const MAX_EVENT_DEPTH = RUNTIME_LIMITS.maxEventDepth;

/**
 * Public, pure entry point. Clones the incoming state once and never mutates
 * the caller's argument. All internal mutation happens on the private clone.
 */
export function dispatchEvent(
  game: CompiledGame,
  state: GameState,
  event: GameEvent,
): DispatchResult {
  const working = deepCloneState(state);
  return dispatchEventInternal(game, working, event, 0);
}

/**
 * Internal engine. Mutates `state`, which MUST already be a private working
 * copy owned by the caller (`dispatchEvent` or `tick`). Returns a result whose
 * `state` is that same working copy.
 */
export function dispatchEventInternal(
  game: CompiledGame,
  state: GameState,
  event: GameEvent,
  depth: number,
): DispatchResult {
  const errors: JsonDeckError[] = [];
  const warnings: JsonDeckWarning[] = [];
  const matchedRules: string[] = [];
  const executedRules: string[] = [];
  const commands: ExecutedCommandRecord[] = [];
  const emittedEvents: GameEvent[] = [];
  const dispatchResults: DispatchResult[] = [];

  // Lightweight structural validation of the incoming event.
  const eventError = validateEvent(event);
  if (eventError) {
    return rejected(state, eventError, warnings);
  }

  const eventContext = createEventContext(event, state);
  if (!eventContext) {
    return rejected(
      state,
      { code: 'INVALID_EVENT', message: `Cannot create context for event: ${event.type}` },
      warnings,
    );
  }

  const matchingRules = game.rules.filter((r) => r.on === event.type);
  matchedRules.push(...matchingRules.map((r) => r.id));

  for (const rule of matchingRules) {
    const ruleContext = { ...eventContext };

    if (rule.if) {
      const condResult = evaluateCondition(rule.if, state, ruleContext);
      warnings.push(...condResult.warnings);
      if (!condResult.value) {
        continue;
      }
    }

    // Transaction: run commands against a clone, commit only on full success.
    const transactionState = deepCloneState(state);
    const ruleCommands: ExecutedCommandRecord[] = [];
    const ruleEmittedEvents: GameEvent[] = [];
    let transactionError: JsonDeckError | undefined;

    for (let cmdIdx = 0; cmdIdx < rule.then.length; cmdIdx++) {
      const cmd = rule.then[cmdIdx];
      const result = executeCommand(cmd, transactionState, ruleContext, game);

      warnings.push(...result.warnings);
      ruleEmittedEvents.push(...result.emittedEvents);
      ruleCommands.push({
        commandIndex: cmdIdx,
        command: cmd,
        success: !result.error,
        error: result.error,
      });

      if (result.error) {
        transactionError = result.error;
        errors.push(result.error);
        break;
      }

      // Subsequent commands see updated vars from this transaction.
      ruleContext.vars = transactionState.vars;
    }

    if (transactionError) {
      // Rollback: discard the transaction clone, keep `state` untouched.
      continue;
    }

    // Commit: copy the transaction's top-level state into the working copy.
    Object.assign(state, transactionState);
    executedRules.push(rule.id);
    commands.push(...ruleCommands);
    emittedEvents.push(...ruleEmittedEvents);
  }

  // `emittedEvents` holds the events emitted by THIS level's rules (the FIFO
  // queue to dispatch). `aggregatedEmitted` additionally collects events emitted
  // by follow-up dispatches so the top-level result exposes the whole chain.
  const aggregatedEmitted: GameEvent[] = [...emittedEvents];

  // Process follow-up (emit_event) events FIFO on the same working copy.
  if (emittedEvents.length > 0) {
    if (depth >= MAX_EVENT_DEPTH) {
      errors.push({
        code: 'MAX_EVENT_DEPTH_EXCEEDED',
        message: `Maximum event depth (${MAX_EVENT_DEPTH}) exceeded`,
      });
    } else {
      for (const emittedEvent of emittedEvents) {
        const followUp = dispatchEventInternal(game, state, emittedEvent, depth + 1);
        dispatchResults.push(followUp);
        // Aggregate telemetry from follow-up dispatches (spec §12, step 6).
        matchedRules.push(...followUp.matchedRules);
        executedRules.push(...followUp.executedRules);
        commands.push(...followUp.commands);
        aggregatedEmitted.push(...followUp.emittedEvents);
        warnings.push(...followUp.warnings);
        errors.push(...followUp.errors);
      }
    }
  }

  return {
    state,
    accepted: executedRules.length > 0,
    matchedRules,
    executedRules,
    commands,
    emittedEvents: aggregatedEmitted,
    errors,
    warnings,
  };
}

function rejected(
  state: GameState,
  error: JsonDeckError,
  warnings: JsonDeckWarning[],
): DispatchResult {
  return {
    state,
    accepted: false,
    matchedRules: [],
    executedRules: [],
    commands: [],
    emittedEvents: [],
    errors: [error],
    warnings,
  };
}
