import { CompiledGame } from '../dsl/types.js';
import { GameState, GameEvent, CardInstance } from '../model/types.js';
import { DispatchResult, ExecutedCommandRecord } from '../runtime/types.js';
import { JsonDeckError, JsonDeckWarning } from '../errors/types.js';
import { evaluateCondition } from './evaluateCondition.js';
import { executeCommand } from '../commands/executeCommand.js';
import { createEventContext } from '../events/createEventContext.js';
import { validateEvent } from './validateEvent.js';
import { deepCloneState } from './deepClone.js';
import { resolveValue, ResolveContext } from '../expressions/resolveValue.js';

const MAX_EVENT_DEPTH = 32;

export function dispatchEvent(
  game: CompiledGame,
  state: GameState,
  event: GameEvent,
): DispatchResult {
  return dispatchEventInternal(game, state, event, 0);
}

function dispatchEventInternal(
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

  // Validate event
  const eventError = validateEvent(event);
  if (eventError) {
    return {
      state,
      accepted: false,
      matchedRules: [],
      executedRules: [],
      commands: [],
      emittedEvents: [],
      errors: [eventError],
      warnings,
    };
  }

  // Create event context
  const eventContext = createEventContext(event, state);
  if (!eventContext) {
    return {
      state,
      accepted: false,
      matchedRules: [],
      executedRules: [],
      commands: [],
      emittedEvents: [],
      errors: [
        {
          code: 'INVALID_EVENT',
          message: `Cannot create context for event: ${event.type}`,
        },
      ],
      warnings,
    };
  }

  // Find matching rules
  const matchingRules = game.rules.filter((r) => r.on === event.type);
  matchedRules.push(...matchingRules.map((r) => r.id));

  // Execute rules
  for (const rule of matchingRules) {
    const ruleContext = { ...eventContext };

    // Evaluate condition
    if (rule.if) {
      const condResult = evaluateCondition(rule.if, state, ruleContext);
      warnings.push(...condResult.warnings);
      if (!condResult.value) {
        continue; // Skip this rule
      }
    }

    // Clone state for transaction
    const transactionState = deepCloneState(state);
    const ruleCommands: ExecutedCommandRecord[] = [];
    const ruleEmittedEvents: GameEvent[] = [];
    let transactionError: JsonDeckError | undefined;

    // Execute commands
    for (let cmdIdx = 0; cmdIdx < rule.then.length; cmdIdx++) {
      const cmd = rule.then[cmdIdx];

      // Special handling for create_card
      let cmdState = transactionState;
      let cmdWarnings: JsonDeckWarning[] = [];
      let cmdError: JsonDeckError | undefined;
      let cmdEmittedEvents: GameEvent[] = [];

      if ('create_card' in cmd) {
        const createResult = executeCreateCard(cmd, cmdState, game, ruleContext);
        cmdState = createResult.state;
        cmdWarnings = createResult.warnings;
        cmdError = createResult.error;
        cmdEmittedEvents = createResult.emittedEvents;
      } else {
        const result = executeCommand(cmd, cmdState, ruleContext);
        cmdState = result.state;
        cmdWarnings = result.warnings;
        cmdError = result.error;
        cmdEmittedEvents = result.emittedEvents;
      }

      ruleCommands.push({
        commandIndex: cmdIdx,
        command: cmd,
        success: !cmdError,
        error: cmdError,
      });

      warnings.push(...cmdWarnings);
      ruleEmittedEvents.push(...cmdEmittedEvents);

      if (cmdError) {
        transactionError = cmdError;
        errors.push(cmdError);
        break; // Rollback transaction
      }

      // Update context for next command (transaction state)
      Object.assign(ruleContext, {
        vars: cmdState.vars,
      });
    }

    if (transactionError) {
      // Rollback - don't update state
      continue;
    }

    // Commit transaction
    Object.assign(state, transactionState);
    executedRules.push(rule.id);
    commands.push(...ruleCommands);
    emittedEvents.push(...ruleEmittedEvents);
  }

  // Handle follow-up events (emit_event)
  if (emittedEvents.length > 0 && depth < MAX_EVENT_DEPTH) {
    for (const emittedEvent of emittedEvents) {
      const followUpResult = dispatchEventInternal(game, state, emittedEvent, depth + 1);
      Object.assign(state, followUpResult.state);
      dispatchResults.push(followUpResult);
      warnings.push(...followUpResult.warnings);
      errors.push(...followUpResult.errors);
    }
  }

  if (emittedEvents.length > 0 && depth >= MAX_EVENT_DEPTH) {
    errors.push({
      code: 'MAX_EVENT_DEPTH_EXCEEDED',
      message: `Maximum event depth (${MAX_EVENT_DEPTH}) exceeded`,
    });
  }

  return {
    state,
    accepted: executedRules.length > 0 || dispatchResults.some((r) => r.accepted),
    matchedRules,
    executedRules,
    commands,
    emittedEvents,
    errors,
    warnings,
  };
}

function executeCreateCard(
  cmd: { create_card: any },
  state: GameState,
  game: CompiledGame,
  context: ResolveContext,
): {
  state: GameState;
  error: JsonDeckError | undefined;
  warnings: JsonDeckWarning[];
  emittedEvents: GameEvent[];
} {
  const warnings: JsonDeckWarning[] = [];
  const cc = cmd.create_card;

  const typeRes = resolveValue(cc.type, context);
  const zoneRes = resolveValue(cc.zone, context);
  const countRes = resolveValue(cc.count, context);

  warnings.push(...typeRes.warnings, ...zoneRes.warnings, ...countRes.warnings);

  const typeName = typeRes.value as string;
  const zoneId = zoneRes.value as string;
  const count = countRes.value as number;

  if (!Number.isInteger(count) || count < 1) {
    return {
      state,
      error: {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `create_card.count must be positive integer, got: ${count}`,
      },
      warnings,
      emittedEvents: [],
    };
  }

  const cardType = game.cardTypes[typeName];
  if (!cardType) {
    return {
      state,
      error: {
        code: 'UNKNOWN_CARD_TYPE',
        message: `Unknown card type: ${typeName}`,
      },
      warnings,
      emittedEvents: [],
    };
  }

  const zone = state.zones[zoneId];
  if (!zone) {
    return {
      state,
      error: { code: 'UNKNOWN_ZONE', message: `Zone not found: ${zoneId}` },
      warnings,
      emittedEvents: [],
    };
  }

  let nearCard: CardInstance | undefined;
  if (cc.near !== undefined) {
    const nearRes = resolveValue(cc.near, context);
    warnings.push(...nearRes.warnings);
    nearCard = state.cards[nearRes.value as string];

    if (!nearCard) {
      return {
        state,
        error: {
          code: 'UNKNOWN_CARD',
          message: `Card not found for "near": ${nearRes.value}`,
        },
        warnings,
        emittedEvents: [],
      };
    }
  }

  // Create cards
  for (let i = 0; i < count; i++) {
    let seq = state.meta.nextCardSeq;
    while (state.cards[`__jd_card_${seq}`]) {
      seq++;
    }
    state.meta.nextCardSeq = seq + 1;

    const cardId = `__jd_card_${seq}`;
    let x = nearCard?.x ?? 0;
    let y = nearCard?.y ?? 0;

    if (nearCard) {
      x = (nearCard.x ?? 0) + 30 * i;
      y = (nearCard.y ?? 0) + 30 * i;
    }

    const newCard: CardInstance = {
      id: cardId,
      type: typeName,
      zone: zoneId,
      x,
      y,
      z: nearCard?.z ?? 0,
      face: 'up',
      props: { ...(cardType.props || {}) },
      tags: [...(cardType.tags || [])],
    };

    state.cards[cardId] = newCard;
    zone.cardIds.push(cardId);
  }

  return { state, error: undefined, warnings, emittedEvents: [] };
}
