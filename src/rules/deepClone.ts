import { GameState, CardInstance, ZoneState, TimerInstance } from '../model/types.js';
import { deepCloneValue } from '../util/clone.js';

export function deepCloneState(state: GameState): GameState {
  return {
    gameId: state.gameId,
    tick: state.tick,
    nowMs: state.nowMs,
    vars: { ...state.vars },
    cards: Object.fromEntries(
      Object.entries(state.cards).map(([id, card]) => [id, deepCloneCard(card)]),
    ),
    zones: Object.fromEntries(
      Object.entries(state.zones).map(([id, zone]) => [id, deepCloneZone(zone)]),
    ),
    timers: Object.fromEntries(
      Object.entries(state.timers).map(([id, timer]) => [id, deepCloneTimer(timer)]),
    ),
    meta: { ...state.meta },
  };
}

function deepCloneCard(card: CardInstance): CardInstance {
  return {
    ...card,
    props: { ...card.props },
    tags: [...card.tags],
    ...(card.children && { children: [...card.children] }),
  };
}

function deepCloneZone(zone: ZoneState): ZoneState {
  return {
    ...zone,
    cardIds: [...zone.cardIds],
  };
}

function deepCloneTimer(timer: TimerInstance): TimerInstance {
  // `bind` can hold nested objects/arrays (deep-resolved at start_timer), so it
  // must be cloned recursively — a shallow copy would alias nested values back
  // into the runtime's internal state.
  return {
    ...timer,
    bind: deepCloneValue(timer.bind) as Record<string, unknown>,
  };
}
