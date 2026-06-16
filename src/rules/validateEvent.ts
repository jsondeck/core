import { GameEvent } from '../model/types.js';
import { JsonDeckError } from '../errors/types.js';

export function validateEvent(event: GameEvent): JsonDeckError | null {
  const validBuiltInEvents = [
    'game.started',
    'card.clicked',
    'card.drag_started',
    'card.dropped_on_card',
    'card.dropped_on_zone',
    'card.dropped_on_empty',
    'timer.finished',
  ];

  if (!validBuiltInEvents.includes(event.type) && !event.type.startsWith('custom.')) {
    return {
      code: 'INVALID_EVENT',
      message: `Invalid event type: ${event.type}. Must be built-in or start with "custom."`,
    };
  }

  // Validate built-in event structure
  if (event.type === 'card.clicked' || event.type === 'card.drag_started') {
    const e = event as any;
    if (!e.source) {
      return {
        code: 'INVALID_EVENT',
        message: `Event ${event.type} requires "source" field`,
      };
    }
  }

  if (event.type === 'card.dropped_on_card') {
    const e = event as any;
    if (!e.source || !e.target || !e.position) {
      return {
        code: 'INVALID_EVENT',
        message: `Event ${event.type} requires "source", "target", and "position" fields`,
      };
    }
  }

  if (event.type === 'card.dropped_on_zone') {
    const e = event as any;
    if (!e.source || !e.targetZone || !e.position) {
      return {
        code: 'INVALID_EVENT',
        message: `Event ${event.type} requires "source", "targetZone", and "position" fields`,
      };
    }
  }

  if (event.type === 'card.dropped_on_empty') {
    const e = event as any;
    if (!e.source || !e.position) {
      return {
        code: 'INVALID_EVENT',
        message: `Event ${event.type} requires "source" and "position" fields`,
      };
    }
  }

  if (event.type === 'timer.finished') {
    const e = event as any;
    if (!e.timerRuntimeId || !e.timer) {
      return {
        code: 'INVALID_EVENT',
        message: `Event ${event.type} requires "timerRuntimeId" and "timer" fields`,
      };
    }
  }

  return null;
}
