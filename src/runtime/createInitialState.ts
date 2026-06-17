import { CompiledGame, GameValue } from '../dsl/types.js';
import { GameState, CardInstance, ZoneState } from '../model/types.js';

export function createInitialState(game: CompiledGame): GameState {
  const vars: Record<string, GameValue> = {};
  for (const [varName, varDef] of Object.entries(game.variables)) {
    vars[varName] = varDef.initial;
  }

  const zones: Record<string, ZoneState> = {};
  for (const zoneId of Object.keys(game.zones)) {
    zones[zoneId] = {
      id: zoneId,
      cardIds: [],
    };
  }

  const cards: Record<string, CardInstance> = {};
  for (const initialCard of game.initialState.cards) {
    const cardType = game.cardTypes[initialCard.type];
    const card: CardInstance = {
      id: initialCard.id,
      type: initialCard.type,
      zone: initialCard.zone,
      x: initialCard.x,
      y: initialCard.y,
      z: initialCard.z,
      face: initialCard.face,
      props: { ...(cardType.props || {}) },
      tags: [...(cardType.tags || [])],
    };
    cards[initialCard.id] = card;

    // Add to zone
    zones[initialCard.zone].cardIds.push(initialCard.id);
  }

  const state: GameState = {
    gameId: game.id,
    tick: 0,
    nowMs: 0,
    vars,
    cards,
    zones,
    timers: {},
    meta: {
      nextCardSeq: 1,
      nextTimerSeq: 1,
    },
  };

  return state;
}
