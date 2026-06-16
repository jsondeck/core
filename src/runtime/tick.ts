import { CompiledGame } from '../dsl/types.js';
import { GameState, TimerSnapshot, TimerFinishedEvent } from '../model/types.js';
import { TickResult } from './types.js';
import { dispatchEvent } from '../rules/dispatchEvent.js';
import { JsonDeckError } from '../errors/types.js';

export function tick(
  game: CompiledGame,
  state: GameState,
  deltaMs: number,
): TickResult {
  const errors: JsonDeckError[] = [];
  const processedTimers: string[] = [];
  const dispatchResults: any[] = [];

  // Validate deltaMs
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    return {
      state,
      processedTimers: [],
      dispatchResults: [],
      errors: [
        {
          code: 'INVALID_TICK_DELTA',
          message: `tick deltaMs must be a finite non-negative number, got: ${deltaMs}`,
        },
      ],
      warnings: [],
    };
  }

  // Get existing timers (only these will be processed/completed)
  const existingTimers = new Set(Object.keys(state.timers));

  // Advance time
  state.nowMs += deltaMs;
  state.tick += 1;

  // Decrease remaining time for all timers
  for (const [runtimeId, timer] of Object.entries(state.timers)) {
    timer.remainingMs -= deltaMs;
  }

  // Process timers that existed at start of tick
  for (const runtimeId of existingTimers) {
    const timer = state.timers[runtimeId];
    if (!timer) continue; // Timer might have been deleted in previous iteration

    if (timer.remainingMs <= 0) {
      processedTimers.push(runtimeId);

      // Create timer snapshot
      const snapshot: TimerSnapshot = {
        runtimeId: timer.runtimeId,
        id: timer.id,
        durationMs: timer.durationMs,
        bind: { ...timer.bind },
      };

      // Remove timer
      delete state.timers[runtimeId];

      // Dispatch timer.finished event
      const event: TimerFinishedEvent = {
        type: 'timer.finished',
        timerRuntimeId: runtimeId,
        timer: snapshot,
      };

      const result = dispatchEvent(game, state, event);
      state = result.state;
      dispatchResults.push(result);
      errors.push(...result.errors);
    }
  }

  return {
    state,
    processedTimers,
    dispatchResults,
    errors,
    warnings: dispatchResults.flatMap((r) => r.warnings),
  };
}
