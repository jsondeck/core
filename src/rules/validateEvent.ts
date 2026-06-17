import { GameEvent, GameState } from '../model/types.js';
import { JsonDeckError } from '../errors/types.js';

const BUILT_IN_EVENTS: ReadonlyArray<string> = [
  'game.started',
  'card.clicked',
  'card.drag_started',
  'card.dropped_on_card',
  'card.dropped_on_zone',
  'card.dropped_on_empty',
  'timer.finished',
];

function invalid(message: string): JsonDeckError {
  return { code: 'INVALID_EVENT', message };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/** A position must be an object with finite numeric `x` and `y`. */
function isValidPosition(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}

/**
 * Structural validation of an incoming event. Accepts `unknown` because callers
 * may pass loosely-typed/untrusted values (e.g. from a UI or the network); it
 * never throws and returns an `INVALID_EVENT` error for non-object inputs, a
 * missing/non-string `type`, or built-in events whose required fields are
 * missing or of the wrong type.
 */
export function validateEvent(raw: unknown): JsonDeckError | null {
  if (!isRecord(raw)) {
    return invalid('Event must be a non-null object');
  }

  const type = raw.type;
  if (typeof type !== 'string') {
    return invalid('Event "type" must be a string');
  }
  if (!BUILT_IN_EVENTS.includes(type) && !type.startsWith('custom.')) {
    return invalid(`Invalid event type: ${type}. Must be built-in or start with "custom."`);
  }

  // `type` is a known/custom string; treat as a GameEvent for field checks.
  const event = raw as GameEvent & Record<string, unknown>;

  switch (event.type) {
    case 'game.started':
      return null;

    case 'card.clicked':
    case 'card.drag_started':
      if (!isNonEmptyString(event.source)) {
        return invalid(`Event ${event.type} requires a string "source"`);
      }
      if (event.position !== undefined && !isValidPosition(event.position)) {
        return invalid(`Event ${event.type} "position" must be { x: number, y: number }`);
      }
      return null;

    case 'card.dropped_on_card':
      if (!isNonEmptyString(event.source)) {
        return invalid(`Event ${event.type} requires a string "source"`);
      }
      if (!isNonEmptyString(event.target)) {
        return invalid(`Event ${event.type} requires a string "target"`);
      }
      if (!isValidPosition(event.position)) {
        return invalid(`Event ${event.type} requires "position" as { x: number, y: number }`);
      }
      return null;

    case 'card.dropped_on_zone':
      if (!isNonEmptyString(event.source)) {
        return invalid(`Event ${event.type} requires a string "source"`);
      }
      if (!isNonEmptyString(event.targetZone)) {
        return invalid(`Event ${event.type} requires a string "targetZone"`);
      }
      if (!isValidPosition(event.position)) {
        return invalid(`Event ${event.type} requires "position" as { x: number, y: number }`);
      }
      return null;

    case 'card.dropped_on_empty':
      if (!isNonEmptyString(event.source)) {
        return invalid(`Event ${event.type} requires a string "source"`);
      }
      if (!isValidPosition(event.position)) {
        return invalid(`Event ${event.type} requires "position" as { x: number, y: number }`);
      }
      if (event.zone !== undefined && typeof event.zone !== 'string') {
        return invalid(`Event ${event.type} "zone" must be a string when present`);
      }
      return null;

    case 'timer.finished': {
      if (!isNonEmptyString(event.timerRuntimeId)) {
        return invalid(`Event ${event.type} requires a string "timerRuntimeId"`);
      }
      const timer = event.timer;
      if (
        !isRecord(timer) ||
        !isNonEmptyString(timer.runtimeId) ||
        !isNonEmptyString(timer.id) ||
        typeof timer.durationMs !== 'number' ||
        !Number.isFinite(timer.durationMs) ||
        !isRecord(timer.bind)
      ) {
        return invalid(
          `Event ${event.type} requires a "timer" snapshot { runtimeId, id, durationMs, bind }`,
        );
      }
      return null;
    }

    default:
      // custom.* — validated above; payload, if present, must be an object.
      if (event.payload !== undefined && !isRecord(event.payload)) {
        return invalid(`Custom event "payload" must be an object when present`);
      }
      return null;
  }
}

function unknownCard(field: string, id: string): JsonDeckError {
  return {
    code: 'UNKNOWN_CARD',
    message: `Event references unknown card in "${field}": ${id}`,
    path: field,
    details: { field, id },
  };
}

function unknownZone(field: string, id: string): JsonDeckError {
  return {
    code: 'UNKNOWN_ZONE',
    message: `Event references unknown zone in "${field}": ${id}`,
    path: field,
    details: { field, id },
  };
}

/**
 * Validates event references against the current state after structural event
 * validation has succeeded. This prevents stale UI/server events from applying
 * rules for cards or zones that do not exist in the authoritative state.
 */
export function validateEventReferences(event: GameEvent, state: GameState): JsonDeckError | null {
  switch (event.type) {
    case 'card.clicked':
    case 'card.drag_started':
      return state.cards[event.source] ? null : unknownCard('source', event.source);

    case 'card.dropped_on_card':
      if (!state.cards[event.source]) return unknownCard('source', event.source);
      if (!state.cards[event.target]) return unknownCard('target', event.target);
      return null;

    case 'card.dropped_on_zone':
      if (!state.cards[event.source]) return unknownCard('source', event.source);
      if (!state.zones[event.targetZone]) return unknownZone('targetZone', event.targetZone);
      return null;

    case 'card.dropped_on_empty':
      if (!state.cards[event.source]) return unknownCard('source', event.source);
      if (event.zone !== undefined && !state.zones[event.zone])
        return unknownZone('zone', event.zone);
      return null;

    case 'game.started':
    case 'timer.finished':
    default:
      return null;
  }
}
