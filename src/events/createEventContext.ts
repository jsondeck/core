import { GameEvent } from '../model/types.js';
import { GameState } from '../model/types.js';
import { ResolveContext } from '../expressions/resolveValue.js';

export function createEventContext(
  event: GameEvent,
  state: GameState,
): ResolveContext | null {
  switch (event.type) {
    case 'game.started':
      return {
        event,
        vars: state.vars,
      };

    case 'card.clicked':
      return {
        event,
        source: event.source,
        position: event.position,
        vars: state.vars,
      };

    case 'card.drag_started':
      return {
        event,
        source: event.source,
        position: event.position,
        vars: state.vars,
      };

    case 'card.dropped_on_card':
      return {
        event,
        source: event.source,
        target: event.target,
        position: event.position,
        vars: state.vars,
      };

    case 'card.dropped_on_zone':
      return {
        event,
        source: event.source,
        target: { type: 'zone', zone: event.targetZone },
        position: event.position,
        vars: state.vars,
      };

    case 'card.dropped_on_empty':
      return {
        event,
        source: event.source,
        target: { type: 'empty', zone: event.zone ?? null },
        position: event.position,
        vars: state.vars,
      };

    case 'timer.finished':
      return {
        event,
        timer: event.timer,
        vars: state.vars,
      };

    default:
      if (event.type.startsWith('custom.')) {
        return {
          event,
          vars: state.vars,
        };
      }
      return null;
  }
}
