import { CompiledGame } from '../dsl/types.js';
import { GameState, TimerSnapshot, TimerFinishedEvent } from '../model/types.js';
import { TickResult, DispatchResult } from './types.js';
import { dispatchEventInternal } from '../rules/dispatchEvent.js';
import { deepCloneState } from '../rules/deepClone.js';
import { JsonDeckError, JsonDeckWarning } from '../errors/types.js';

/**
 * Advances time by `deltaMs` and processes due timers. Pure: the incoming
 * `state` is never mutated; all work happens on a private clone.
 *
 * `deltaMs` must be a finite number >= 0. An invalid delta returns a TickResult
 * with the unchanged (cloned) state and an INVALID_TICK_DELTA error.
 */
export function tick(game: CompiledGame, state: GameState, deltaMs: number): TickResult {
  const errors: JsonDeckError[] = [];
  const warnings: JsonDeckWarning[] = [];
  const processedTimers: string[] = [];
  const dispatchResults: DispatchResult[] = [];

  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    return {
      state: deepCloneState(state),
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

  const working = deepCloneState(state);

  // Only timers that existed at the start of this tick are eligible to fire.
  const existingTimerIds = Object.keys(working.timers);

  working.nowMs += deltaMs;
  working.tick += 1;

  // Decrease remaining time for the pre-existing timers only. Timers created
  // during this tick (e.g. inside a timer.finished handler) keep their full
  // duration and start counting down on the next tick.
  for (const runtimeId of existingTimerIds) {
    const timer = working.timers[runtimeId];
    if (timer) {
      timer.remainingMs -= deltaMs;
    }
  }

  // Fire due timers in ascending `seq` order for deterministic processing.
  const dueTimers = existingTimerIds
    .map((id) => working.timers[id])
    .filter((t) => t && t.remainingMs <= 0)
    .sort((a, b) => a.seq - b.seq);

  for (const timer of dueTimers) {
    const runtimeId = timer.runtimeId;
    // The timer may already be gone if a prior handler destroyed it.
    if (!working.timers[runtimeId]) continue;

    processedTimers.push(runtimeId);

    const snapshot: TimerSnapshot = {
      runtimeId: timer.runtimeId,
      id: timer.id,
      durationMs: timer.durationMs,
      bind: { ...timer.bind },
    };

    delete working.timers[runtimeId];

    const event: TimerFinishedEvent = {
      type: 'timer.finished',
      timerRuntimeId: runtimeId,
      timer: snapshot,
    };

    const result = dispatchEventInternal(game, working, event, 0);
    dispatchResults.push(result);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return {
    state: working,
    processedTimers,
    dispatchResults,
    errors,
    warnings,
  };
}
