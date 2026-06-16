import { describe, it, expect } from 'vitest';
import { compileGame, createInitialState, dispatchEvent, tick } from '../src/index.js';
import fixtureData from './fixtures/generic-card-interaction.json';

describe('tick & timers', () => {
  const game = compileGame(fixtureData);

  it('should process full fixture scenario', () => {
    let state = createInitialState(game);

    // Trigger card.dropped_on_card
    const result = dispatchEvent(game, state, {
      type: 'card.dropped_on_card',
      source: 'card_a_1',
      target: 'card_b_1',
      position: { x: 540, y: 320 },
    });

    state = result.state;
    expect(state.timers[Object.keys(state.timers)[0]].durationMs).toBe(5000);

    // Tick for 5000ms
    const tickResult = tick(game, state, 5000);
    state = tickResult.state;

    // Timer should be processed
    expect(tickResult.processedTimers.length).toBe(1);

    // Card should be destroyed
    expect(state.cards['card_b_1']).toBeUndefined();

    // Result cards should be created
    const resultCards = Object.values(state.cards).filter((c) => c.type === 'card_type_result');
    expect(resultCards.length).toBe(3);

    // Counter should be incremented
    expect(state.vars.counter).toBe(3);
  });

  it('should not complete timer with partial deltaMs', () => {
    let state = createInitialState(game);

    // Create timer
    const result = dispatchEvent(game, state, {
      type: 'card.dropped_on_card',
      source: 'card_a_1',
      target: 'card_b_1',
      position: { x: 540, y: 320 },
    });

    state = result.state;
    const timerId = Object.keys(state.timers)[0];

    // Tick for partial time
    const tickResult = tick(game, state, 2500);
    state = tickResult.state;

    // Timer should still exist
    expect(state.timers[timerId]).toBeDefined();
    expect(state.timers[timerId].remainingMs).toBe(2500);

    // Card should not be destroyed
    expect(state.cards['card_b_1']).toBeDefined();
  });

  it('should handle multiple timers in order', () => {
    const multiTimerGame = compileGame({
      jsondeck: '0.1',
      id: 'multi-timer',
      title: 'Multi Timer',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: { ct: { title: 'Card' } },
      initialState: { cards: [{ id: 'c1', type: 'ct', zone: 'z1' }] },
      rules: [
        {
          id: 'r1',
          on: 'game.started',
          then: [
            {
              start_timer: {
                id: 't1',
                duration_ms: 1000,
                bind: { order: 1 },
              },
            },
            {
              start_timer: {
                id: 't2',
                duration_ms: 1000,
                bind: { order: 2 },
              },
            },
          ],
        },
        {
          id: 'process_timer',
          on: 'timer.finished',
          then: [
            {
              set_var: {
                name: 'last_timer',
                value: '$timer.bind.order',
              },
            },
          ],
        },
      ],
      variables: {
        last_timer: { type: 'number', initial: 0 },
      },
    });

    let state = createInitialState(multiTimerGame);

    // Start timers
    const result = dispatchEvent(multiTimerGame, state, { type: 'game.started' });
    state = result.state;

    expect(Object.keys(state.timers).length).toBe(2);

    // Tick
    const tickResult = tick(multiTimerGame, state, 1000);
    state = tickResult.state;

    expect(tickResult.processedTimers.length).toBe(2);
  });

  it('should validate deltaMs', () => {
    const state = createInitialState(game);

    const negativeResult = tick(game, state, -100);
    expect(negativeResult.errors.some((e) => e.code === 'INVALID_TICK_DELTA')).toBe(true);
    expect(negativeResult.state).toEqual(state);

    const nanResult = tick(game, state, NaN);
    expect(nanResult.errors.some((e) => e.code === 'INVALID_TICK_DELTA')).toBe(true);

    const infinityResult = tick(game, state, Infinity);
    expect(infinityResult.errors.some((e) => e.code === 'INVALID_TICK_DELTA')).toBe(true);
  });

  it('should advance tick counter', () => {
    let state = createInitialState(game);
    expect(state.tick).toBe(0);

    let result = tick(game, state, 100);
    state = result.state;
    expect(state.tick).toBe(1);
    expect(state.nowMs).toBe(100);

    result = tick(game, state, 500);
    state = result.state;
    expect(state.tick).toBe(2);
    expect(state.nowMs).toBe(600);
  });

  it('should not process timers created during current tick', () => {
    const nestedTimerGame = compileGame({
      jsondeck: '0.1',
      id: 'nested',
      title: 'Nested Timer',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: { ct: { title: 'Card' } },
      initialState: { cards: [{ id: 'c1', type: 'ct', zone: 'z1' }] },
      rules: [
        {
          id: 'r1',
          on: 'game.started',
          then: [
            {
              start_timer: {
                id: 'first_timer',
                duration_ms: 100,
              },
            },
          ],
        },
        {
          id: 'r2',
          on: 'timer.finished',
          if: { eq: ['$timer.id', 'first_timer'] },
          then: [
            {
              start_timer: {
                id: 'second_timer',
                duration_ms: 200,
              },
            },
          ],
        },
      ],
    });

    let state = createInitialState(nestedTimerGame);

    // Start first timer
    const result = dispatchEvent(nestedTimerGame, state, { type: 'game.started' });
    state = result.state;
    expect(Object.keys(state.timers).length).toBe(1);

    // Tick for 100ms - should complete first timer, which creates second timer
    let tickResult = tick(nestedTimerGame, state, 100);
    state = tickResult.state;

    // Both timers should exist: first is deleted, second is created
    expect(Object.keys(state.timers).length).toBe(1);
    const secondTimerId = Object.keys(state.timers)[0];
    expect(state.timers[secondTimerId].id).toBe('second_timer');
    // Second timer should not have been processed yet, so remainingMs should still be 200
    expect(state.timers[secondTimerId].remainingMs).toBe(200);

    // Tick for 200ms more - now second timer should complete
    tickResult = tick(nestedTimerGame, state, 200);
    state = tickResult.state;

    expect(Object.keys(state.timers).length).toBe(0);
  });
});
