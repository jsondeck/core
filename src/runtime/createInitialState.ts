import { CompiledGame } from '../dsl/types.js';
import { GameState } from '../model/types.js';

export function createInitialState(game: CompiledGame): GameState {
  const vars: Record<string, any> = {};
  for (const [varName, varDef] of Object.entries(game.variables)) {
    vars[varName] = varDef.initial;
  }

  const zones: Record<string, any> = {};
  for (const zoneId of Object.keys(game.zones)) {
    zones[zoneId] = {
      id: zoneId,
      cardIds: [] as string[],
    };
  }

  const cards: Record<string, any> = {};
  for (const initialCard of game.initialState.cards) {
    const cardType = game.cardTypes[initialCard.type];
    const card = {
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
