import { GameState, GameEvent } from '../model/types.js';
import { Runtime, DispatchResult, TickResult } from './types.js';
import { compileGame } from '../dsl/compileGame.js';
import { createInitialState } from './createInitialState.js';
import { dispatchEvent } from '../rules/dispatchEvent.js';
import { tick } from './tick.js';
import { buildViewModel } from '../view/buildViewModel.js';

export function createRuntime(raw: unknown): Runtime {
  const game = compileGame(raw);
  let state = createInitialState(game);

  return {
    dispatch(event: GameEvent): DispatchResult {
      const result = dispatchEvent(game, state, event);
      state = result.state;
      return result;
    },

    tick(deltaMs: number): TickResult {
      const result = tick(game, state, deltaMs);
      state = result.state;
      return result;
    },

    getState(): GameState {
      return state;
    },

    getViewModel() {
      return buildViewModel(game, state);
    },

    reset(): GameState {
      state = createInitialState(game);
      return state;
    },
  };
}
