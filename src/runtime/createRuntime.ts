import { GameState, GameEvent } from '../model/types.js';
import { Runtime, DispatchResult, TickResult } from './types.js';
import { compileGame } from '../dsl/compileGame.js';
import { createInitialState } from './createInitialState.js';
import { dispatchEvent } from '../rules/dispatchEvent.js';
import { tick } from './tick.js';
import { buildViewModel } from '../view/buildViewModel.js';
import { deepCloneState } from '../rules/deepClone.js';

/**
 * Convenience wrapper that owns a private `GameState`. Every method that hands a
 * state object back to the caller returns a deep clone, so the runtime's
 * internal state can never be mutated except through `dispatch`/`tick`/`reset`.
 * Power users who want zero-copy access should use the pure `dispatchEvent` /
 * `tick` functions directly.
 */
export function createRuntime(raw: unknown): Runtime {
  const game = compileGame(raw);
  let state = createInitialState(game);

  return {
    dispatch(event: GameEvent): DispatchResult {
      const result = dispatchEvent(game, state, event);
      state = result.state;
      // Hand back an isolated copy so the returned result can't alias internals.
      return { ...result, state: deepCloneState(state) };
    },

    tick(deltaMs: number): TickResult {
      const result = tick(game, state, deltaMs);
      state = result.state;
      return { ...result, state: deepCloneState(state) };
    },

    getState(): GameState {
      return deepCloneState(state);
    },

    getViewModel() {
      return buildViewModel(game, state);
    },

    reset(): GameState {
      state = createInitialState(game);
      return deepCloneState(state);
    },
  };
}
