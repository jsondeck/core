import { Command } from '../dsl/types.js';
import { GameState, CardInstance } from '../model/types.js';
import { JsonDeckError, JsonDeckWarning } from '../errors/types.js';
import { resolveValue, deepResolveRecord, ResolveContext } from '../expressions/resolveValue.js';

export interface CommandExecutionResult {
  state: GameState;
  error?: JsonDeckError;
  warnings: JsonDeckWarning[];
  emittedEvents: any[];
}

export function executeCommand(
  command: Command,
  state: GameState,
  context: ResolveContext,
): CommandExecutionResult {
  const warnings: JsonDeckWarning[] = [];
  const emittedEvents: any[] = [];

  if ('move_card' in command) {
    const mc = command.move_card;
    const cardRes = resolveValue(mc.card, context);
    warnings.push(...cardRes.warnings);

    const cardId = cardRes.value as string;
    const card = state.cards[cardId];

    if (!card) {
      return {
        state,
        error: { code: 'UNKNOWN_CARD', message: `Card not found: ${cardId}` },
        warnings,
        emittedEvents,
      };
    }

    const zoneRes = resolveValue(mc.to_zone, context);
    warnings.push(...zoneRes.warnings);
    const zoneId = zoneRes.value as string;

    const zone = state.zones[zoneId];
    if (!zone) {
      return {
        state,
        error: { code: 'UNKNOWN_ZONE', message: `Zone not found: ${zoneId}` },
        warnings,
        emittedEvents,
      };
    }

    // Remove from old zone
    const oldZone = state.zones[card.zone];
    oldZone.cardIds = oldZone.cardIds.filter((id) => id !== cardId);

    // Update card
    const updatedCard: CardInstance = {
      ...card,
      zone: zoneId,
    };

    if (mc.x !== undefined) {
      const xRes = resolveValue(mc.x, context);
      warnings.push(...xRes.warnings);
      updatedCard.x = xRes.value as number;
    }

    if (mc.y !== undefined) {
      const yRes = resolveValue(mc.y, context);
      warnings.push(...yRes.warnings);
      updatedCard.y = yRes.value as number;
    }

    state.cards[cardId] = updatedCard;
    zone.cardIds.push(cardId);

    return { state, warnings, emittedEvents };
  }

  if ('create_card' in command) {
    const cc = command.create_card;
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
        emittedEvents,
      };
    }

    const cardType = state.cards['__dummy'] ? null : { props: {}, tags: [] };
    // We'll need game for proper lookup - this is a limitation we'll handle in dispatch

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

    const zone = state.zones[zoneId];
    if (!zone) {
      return {
        state,
        error: { code: 'UNKNOWN_ZONE', message: `Zone not found: ${zoneId}` },
        warnings,
        emittedEvents,
      };
    }

    // Cards will be created in dispatchEvent with game context
    // For now, return success and let dispatchEvent handle actual creation

    return { state, warnings, emittedEvents };
  }

  if ('destroy_card' in command) {
    const dc = command.destroy_card;
    const cardRes = resolveValue(dc.card, context);
    warnings.push(...cardRes.warnings);

    const cardId = cardRes.value as string;
    const card = state.cards[cardId];

    if (!card) {
      return {
        state,
        error: { code: 'UNKNOWN_CARD', message: `Card not found: ${cardId}` },
        warnings,
        emittedEvents,
      };
    }

    // Remove from zone
    const zone = state.zones[card.zone];
    zone.cardIds = zone.cardIds.filter((id) => id !== cardId);

    // Remove card
    delete state.cards[cardId];

    return { state, warnings, emittedEvents };
  }

  if ('set_var' in command) {
    const sv = command.set_var;
    const valueRes = resolveValue(sv.value, context);
    warnings.push(...valueRes.warnings);

    if (!(sv.name in state.vars)) {
      return {
        state,
        error: {
          code: 'UNKNOWN_VARIABLE',
          message: `Variable not found: ${sv.name}`,
        },
        warnings,
        emittedEvents,
      };
    }

    state.vars[sv.name] = valueRes.value as any;
    return { state, warnings, emittedEvents };
  }

  if ('modify_var' in command) {
    const mv = command.modify_var;
    const addRes = resolveValue(mv.add, context);
    warnings.push(...addRes.warnings);

    if (!(mv.name in state.vars)) {
      return {
        state,
        error: {
          code: 'UNKNOWN_VARIABLE',
          message: `Variable not found: ${mv.name}`,
        },
        warnings,
        emittedEvents,
      };
    }

    const current = state.vars[mv.name] as number;
    const addValue = addRes.value as number;
    state.vars[mv.name] = current + addValue;

    return { state, warnings, emittedEvents };
  }

  if ('flip_card' in command) {
    const fc = command.flip_card;
    const cardRes = resolveValue(fc.card, context);
    warnings.push(...cardRes.warnings);

    const cardId = cardRes.value as string;
    const card = state.cards[cardId];

    if (!card) {
      return {
        state,
        error: { code: 'UNKNOWN_CARD', message: `Card not found: ${cardId}` },
        warnings,
        emittedEvents,
      };
    }

    card.face = fc.face;
    return { state, warnings, emittedEvents };
  }

  if ('start_timer' in command) {
    const st = command.start_timer;
    const durationRes = resolveValue(st.duration_ms, context);
    warnings.push(...durationRes.warnings);

    const duration = durationRes.value as number;
    if (typeof duration !== 'number' || duration <= 0) {
      return {
        state,
        error: {
          code: 'SEMANTIC_VALIDATION_ERROR',
          message: `start_timer.duration_ms must be positive, got: ${duration}`,
        },
        warnings,
        emittedEvents,
      };
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

    return { state, warnings, emittedEvents };
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
    };

    emittedEvents.push(event);
    return { state, warnings, emittedEvents };
  }

  return {
    state,
    error: { code: 'INVALID_COMMAND', message: 'Unknown command type' },
    warnings,
    emittedEvents,
  };
}
