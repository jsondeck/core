import { GameState, CardInstance, ZoneState, TimerInstance } from '../model/types.js';

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
  return {
    ...timer,
    bind: { ...timer.bind },
  };
}
