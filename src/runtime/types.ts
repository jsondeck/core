import { GameState, GameEvent, TimerSnapshot } from '../model/types.js';
import { JsonDeckError, JsonDeckWarning } from '../errors/types.js';

export interface ExecutedCommandRecord {
  commandIndex: number;
  command: unknown;
  success: boolean;
  error?: JsonDeckError;
}

export interface DispatchResult {
  state: GameState;
  accepted: boolean;
  matchedRules: string[];
  executedRules: string[];
  commands: ExecutedCommandRecord[];
  emittedEvents: GameEvent[];
  errors: JsonDeckError[];
  warnings: JsonDeckWarning[];
}

export interface TickResult {
  state: GameState;
  processedTimers: string[];
  dispatchResults: DispatchResult[];
  errors: JsonDeckError[];
  warnings: JsonDeckWarning[];
}

export interface Runtime {
  dispatch(event: GameEvent): DispatchResult;
  tick(deltaMs: number): TickResult;
  getState(): GameState;
  getViewModel(): any;
  reset(): GameState;
}
