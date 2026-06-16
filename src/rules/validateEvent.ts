import { GameEvent } from '../model/types.js';
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

/**
 * Lightweight structural validation of an incoming event. The argument is typed
 * as `GameEvent`, but callers may pass loosely-typed/untrusted objects, so each
 * branch re-checks the required fields at runtime after narrowing by `type`.
 */
export function validateEvent(event: GameEvent): JsonDeckError | null {
  if (!BUILT_IN_EVENTS.includes(event.type) && !event.type.startsWith('custom.')) {
    return {
      code: 'INVALID_EVENT',
      message: `Invalid event type: ${event.type}. Must be built-in or start with "custom."`,
    };
  }

  if (event.type === 'card.clicked' || event.type === 'card.drag_started') {
    if (!event.source) {
      return { code: 'INVALID_EVENT', message: `Event ${event.type} requires "source" field` };
    }
  }

  if (event.type === 'card.dropped_on_card') {
    if (!event.source || !event.target || !event.position) {
      return {
        code: 'INVALID_EVENT',
        message: `Event ${event.type} requires "source", "target", and "position" fields`,
      };
    }
  }

  if (event.type === 'card.dropped_on_zone') {
    if (!event.source || !event.targetZone || !event.position) {
      return {
        code: 'INVALID_EVENT',
        message: `Event ${event.type} requires "source", "targetZone", and "position" fields`,
      };
    }
  }

  if (event.type === 'card.dropped_on_empty') {
    if (!event.source || !event.position) {
      return {
        code: 'INVALID_EVENT',
        message: `Event ${event.type} requires "source" and "position" fields`,
      };
    }
  }

  if (event.type === 'timer.finished') {
    if (!event.timerRuntimeId || !event.timer) {
      return {
        code: 'INVALID_EVENT',
        message: `Event ${event.type} requires "timerRuntimeId" and "timer" fields`,
      };
    }
  }

  return null;
}
