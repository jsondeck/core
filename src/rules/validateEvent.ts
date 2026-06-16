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
 * Lightweight structural validation of an incoming event. Accepts `unknown`
 * because callers may pass loosely-typed/untrusted values; it never throws and
 * returns an `INVALID_EVENT` error for non-object inputs, a missing/non-string
 * `type`, or built-in events missing required fields.
 */
export function validateEvent(raw: unknown): JsonDeckError | null {
  if (raw === null || typeof raw !== 'object') {
    return { code: 'INVALID_EVENT', message: 'Event must be a non-null object' };
  }

  const type = (raw as { type?: unknown }).type;
  if (typeof type !== 'string') {
    return { code: 'INVALID_EVENT', message: 'Event "type" must be a string' };
  }

  if (!BUILT_IN_EVENTS.includes(type) && !type.startsWith('custom.')) {
    return {
      code: 'INVALID_EVENT',
      message: `Invalid event type: ${type}. Must be built-in or start with "custom."`,
    };
  }

  // `type` is now a known/custom string; treat as a GameEvent for field checks.
  const event = raw as GameEvent;

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
