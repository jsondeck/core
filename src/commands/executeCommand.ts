import { Command, CompiledGame } from '../dsl/types.js';
import { GameState, CardInstance, GameEvent } from '../model/types.js';
import { JsonDeckError, JsonDeckWarning } from '../errors/types.js';
import { resolveValue, deepResolveRecord, ResolveContext } from '../expressions/resolveValue.js';

export interface CommandExecutionResult {
  state: GameState;
  error?: JsonDeckError;
  warnings: JsonDeckWarning[];
  emittedEvents: GameEvent[];
}

/**
 * Executes a single command against `state`, mutating it in place.
 *
 * The caller is responsible for transaction isolation: `state` is expected to
 * be a private working copy (a clone), so mutating it here never affects the
 * caller's original state. On error the partially-applied copy is discarded by
 * the caller (rollback).
 */
export function executeCommand(
  command: Command,
  state: GameState,
  context: ResolveContext,
  game: CompiledGame,
): CommandExecutionResult {
  const warnings: JsonDeckWarning[] = [];
  const emittedEvents: GameEvent[] = [];

  if ('move_card' in command) {
    const mc = command.move_card;
    const cardRes = resolveValue(mc.card, context);
    warnings.push(...cardRes.warnings);

    const cardId = cardRes.value as string;
    const card = state.cards[cardId];
    if (!card) {
      return err('UNKNOWN_CARD', `Card not found: ${cardId}`);
    }

    const zoneRes = resolveValue(mc.to_zone, context);
    warnings.push(...zoneRes.warnings);
    const zoneId = zoneRes.value as string;

    const zone = state.zones[zoneId];
    if (!zone) {
      return err('UNKNOWN_ZONE', `Zone not found: ${zoneId}`);
    }

    const updatedCard: CardInstance = { ...card, zone: zoneId };

    // Resolve and validate coordinates BEFORE mutating any zone, so an invalid
    // coordinate aborts the command cleanly (and the rule transaction rolls back).
    if (mc.x !== undefined) {
      const xRes = resolveValue(mc.x, context);
      warnings.push(...xRes.warnings);
      if (typeof xRes.value !== 'number' || !Number.isFinite(xRes.value)) {
        return err(
          'COMMAND_EXECUTION_ERROR',
          `move_card.x must resolve to a finite number, got: ${JSON.stringify(xRes.value)}`,
        );
      }
      updatedCard.x = xRes.value;
    }
    if (mc.y !== undefined) {
      const yRes = resolveValue(mc.y, context);
      warnings.push(...yRes.warnings);
      if (typeof yRes.value !== 'number' || !Number.isFinite(yRes.value)) {
        return err(
          'COMMAND_EXECUTION_ERROR',
          `move_card.y must resolve to a finite number, got: ${JSON.stringify(yRes.value)}`,
        );
      }
      updatedCard.y = yRes.value;
    }

    const oldZone = state.zones[card.zone];
    oldZone.cardIds = oldZone.cardIds.filter((id) => id !== cardId);
    state.cards[cardId] = updatedCard;
    zone.cardIds.push(cardId);

    return ok();
  }

  if ('create_card' in command) {
    return executeCreateCard(command.create_card, state, context, game, warnings);
  }

  if ('destroy_card' in command) {
    const dc = command.destroy_card;
    const cardRes = resolveValue(dc.card, context);
    warnings.push(...cardRes.warnings);

    const cardId = cardRes.value as string;
    const card = state.cards[cardId];
    if (!card) {
      return err('UNKNOWN_CARD', `Card not found: ${cardId}`);
    }

    const zone = state.zones[card.zone];
    if (zone) {
      zone.cardIds = zone.cardIds.filter((id) => id !== cardId);
    }
    delete state.cards[cardId];

    return ok();
  }

  if ('set_var' in command) {
    const sv = command.set_var;
    const declared = game.variables[sv.name];
    if (!declared) {
      return err('UNKNOWN_VARIABLE', `Variable not found: ${sv.name}`);
    }

    const valueRes = resolveValue(sv.value, context);
    warnings.push(...valueRes.warnings);
    const value = valueRes.value;

    if (typeof value !== declared.type) {
      return err(
        'INVALID_VARIABLE_TYPE',
        `set_var "${sv.name}" expects ${declared.type}, got ${typeof value}`,
      );
    }
    // Reject NaN/Infinity for number variables to keep state serializable.
    if (declared.type === 'number' && !Number.isFinite(value)) {
      return err(
        'INVALID_VARIABLE_TYPE',
        `set_var "${sv.name}" must be a finite number, got ${value}`,
      );
    }

    state.vars[sv.name] = value as string | number | boolean;
    return ok();
  }

  if ('modify_var' in command) {
    const mv = command.modify_var;
    const declared = game.variables[mv.name];
    if (!declared) {
      return err('UNKNOWN_VARIABLE', `Variable not found: ${mv.name}`);
    }
    if (declared.type !== 'number') {
      return err(
        'INVALID_VARIABLE_TYPE',
        `modify_var can only be used with number variables: ${mv.name}`,
      );
    }

    const current = state.vars[mv.name];
    if (typeof current !== 'number') {
      return err('INVALID_VARIABLE_TYPE', `modify_var "${mv.name}" current value is not a number`);
    }

    const addRes = resolveValue(mv.add, context);
    warnings.push(...addRes.warnings);
    const addValue = addRes.value;

    if (typeof addValue !== 'number' || !Number.isFinite(addValue)) {
      return err(
        'INVALID_VARIABLE_TYPE',
        `modify_var "${mv.name}" add value must resolve to a finite number, got ${
          typeof addValue === 'number' ? addValue : typeof addValue
        }`,
      );
    }

    const next = current + addValue;
    if (!Number.isFinite(next)) {
      return err('INVALID_VARIABLE_TYPE', `modify_var "${mv.name}" overflowed to ${next}`);
    }

    state.vars[mv.name] = next;
    return ok();
  }

  if ('flip_card' in command) {
    const fc = command.flip_card;
    const cardRes = resolveValue(fc.card, context);
    warnings.push(...cardRes.warnings);

    const cardId = cardRes.value as string;
    const card = state.cards[cardId];
    if (!card) {
      return err('UNKNOWN_CARD', `Card not found: ${cardId}`);
    }

    card.face = fc.face;
    return ok();
  }

  if ('start_timer' in command) {
    const st = command.start_timer;
    const durationRes = resolveValue(st.duration_ms, context);
    warnings.push(...durationRes.warnings);

    const duration = durationRes.value;
    if (typeof duration !== 'number' || duration <= 0) {
      return err(
        'COMMAND_EXECUTION_ERROR',
        `start_timer.duration_ms must resolve to a positive number, got: ${JSON.stringify(duration)}`,
      );
    }

    const seq = state.meta.nextTimerSeq++;
    const runtimeId = `__jd_timer_${seq}`;

    let bind: Record<string, unknown> = {};
    if (st.bind) {
      const [resolved, bindWarnings] = deepResolveRecord(st.bind, context);
      bind = resolved;
      warnings.push(...bindWarnings);
    }

    state.timers[runtimeId] = {
      runtimeId,
      seq,
      id: st.id,
      durationMs: duration,
      remainingMs: duration,
      bind,
    };

    return ok();
  }

  if ('emit_event' in command) {
    const ee = command.emit_event;

    let payload: Record<string, unknown> = {};
    if (ee.payload) {
      const [resolved, payloadWarnings] = deepResolveRecord(ee.payload, context);
      payload = resolved;
      warnings.push(...payloadWarnings);
    }

    const event = {
      type: ee.type,
      ...(Object.keys(payload).length > 0 ? { payload } : {}),
    } as GameEvent;

    emittedEvents.push(event);
    return ok();
  }

  return err('INVALID_COMMAND', 'Unknown command type');

  // --- local helpers (capture warnings/emittedEvents/state) ---
  function ok(): CommandExecutionResult {
    return { state, warnings, emittedEvents };
  }
  function err(code: string, message: string): CommandExecutionResult {
    return { state, error: { code, message }, warnings, emittedEvents };
  }
}

function executeCreateCard(
  cc: { type: unknown; zone: unknown; count: unknown; near?: unknown },
  state: GameState,
  context: ResolveContext,
  game: CompiledGame,
  warnings: JsonDeckWarning[],
): CommandExecutionResult {
  const emittedEvents: GameEvent[] = [];

  const typeRes = resolveValue(cc.type, context);
  const zoneRes = resolveValue(cc.zone, context);
  const countRes = resolveValue(cc.count, context);
  warnings.push(...typeRes.warnings, ...zoneRes.warnings, ...countRes.warnings);

  const typeName = typeRes.value as string;
  const zoneId = zoneRes.value as string;
  const count = countRes.value;

  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) {
    return {
      state,
      error: {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `create_card.count must resolve to a positive integer, got: ${JSON.stringify(count)}`,
      },
      warnings,
      emittedEvents,
    };
  }

  const cardType = game.cardTypes[typeName];
  if (!cardType) {
    return {
      state,
      error: { code: 'UNKNOWN_CARD_TYPE', message: `Unknown card type: ${typeName}` },
      warnings,
      emittedEvents,
    };
  }

  const zone = state.zones[zoneId];
  if (!zone) {
    return {
      state,
      error: { code: 'UNKNOWN_ZONE', message: `Zone not found: ${zoneId}` },
      warnings,
      emittedEvents,
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
        emittedEvents,
      };
    }
  }

  for (let i = 0; i < count; i++) {
    let seq = state.meta.nextCardSeq;
    while (state.cards[`__jd_card_${seq}`]) {
      seq++;
    }
    state.meta.nextCardSeq = seq + 1;

    const cardId = `__jd_card_${seq}`;
    const x = nearCard ? (nearCard.x ?? 0) + 30 * i : 0;
    const y = nearCard ? (nearCard.y ?? 0) + 30 * i : 0;

    state.cards[cardId] = {
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
    zone.cardIds.push(cardId);
  }

  return { state, warnings, emittedEvents };
}
