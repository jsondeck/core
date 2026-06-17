import { describe, it, expect } from 'vitest';
import { compileGame, createInitialState, dispatchEvent } from '../src/index.js';
import fixtureData from './fixtures/generic-card-interaction.json';

describe('dispatchEvent', () => {
  const game = compileGame(fixtureData);

  it('should reject invalid event type', () => {
    const state = createInitialState(game);
    const result = dispatchEvent(game, state, { type: 'bad.event' } as never);

    expect(result.accepted).toBe(false);
    expect(result.state).toEqual(state);
    expect(result.errors.some((e) => e.code === 'INVALID_EVENT')).toBe(true);
  });

  it('should reject card.clicked without source', () => {
    const state = createInitialState(game);
    const result = dispatchEvent(game, state, {
      type: 'card.clicked',
      source: undefined,
    } as never);

    expect(result.accepted).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_EVENT')).toBe(true);
  });

  it('should create timer on card.dropped_on_card for actor on target', () => {
    const state = createInitialState(game);
    const result = dispatchEvent(game, state, {
      type: 'card.dropped_on_card',
      source: 'card_a_1',
      target: 'card_b_1',
      position: { x: 540, y: 320 },
    });

    expect(result.accepted).toBe(true);
    expect(result.executedRules).toContain('start_sample_interaction');
    expect(Object.keys(result.state.timers).length).toBe(1);

    const timerId = Object.keys(result.state.timers)[0];
    const timer = result.state.timers[timerId];
    expect(timer.id).toBe('sample_timer');
    expect(timer.durationMs).toBe(5000);
    expect(timer.bind.actorCard).toBe('card_a_1');
    expect(timer.bind.targetCard).toBe('card_b_1');
  });

  it('should not match rule if condition fails', () => {
    const state = createInitialState(game);
    // Drop actor on actor (should not match, need target tag)
    const result = dispatchEvent(game, state, {
      type: 'card.dropped_on_card',
      source: 'card_a_1',
      target: 'card_a_1',
      position: { x: 220, y: 320 },
    });

    expect(result.accepted).toBe(false);
    expect(Object.keys(result.state.timers).length).toBe(0);
  });

  it('should handle game.started event', () => {
    const state = createInitialState(game);
    const result = dispatchEvent(game, state, { type: 'game.started' });

    // Fixture has no rule for game.started, so accepted should be false
    expect(result.accepted).toBe(false);
  });

  it('should emit custom events', () => {
    const state = createInitialState(game);
    const result = dispatchEvent(game, state, {
      type: 'custom.test_event',
      payload: { test: true },
    });

    // Fixture has no rule for custom event
    expect(result.accepted).toBe(false);
    expect(result.errors.length).toBe(0);
  });

  it('should not mutate input state (deep snapshot)', () => {
    const state = createInitialState(game);
    const snapshot = JSON.stringify(state);

    const result = dispatchEvent(game, state, {
      type: 'card.dropped_on_card',
      source: 'card_a_1',
      target: 'card_b_1',
      position: { x: 540, y: 320 },
    });

    // The rule creates a timer; the returned state must reflect it...
    expect(Object.keys(result.state.timers).length).toBe(1);
    // ...but the input state must be byte-for-byte unchanged.
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(Object.keys(state.timers).length).toBe(0);
    expect(result.state).not.toBe(state);
  });

  it('should aggregate follow-up executedRules from emit_event chains', () => {
    const chainGame = compileGame({
      jsondeck: '0.1',
      id: 'chain',
      title: 'Chain',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: {},
      initialState: { cards: [] },
      variables: { n: { type: 'number', initial: 0 } },
      rules: [
        { id: 'parent', on: 'game.started', then: [{ emit_event: { type: 'custom.next' } }] },
        { id: 'child', on: 'custom.next', then: [{ set_var: { name: 'n', value: 2 } }] },
      ],
    });

    const state = createInitialState(chainGame);
    const result = dispatchEvent(chainGame, state, { type: 'game.started' });

    expect(result.accepted).toBe(true);
    expect(result.state.vars.n).toBe(2);
    // Both parent and follow-up child must appear in telemetry.
    expect(result.executedRules).toContain('parent');
    expect(result.executedRules).toContain('child');
    expect(result.matchedRules).toContain('child');
  });

  it('should let later matching rules observe vars committed by earlier rules', () => {
    const chainedRulesGame = compileGame({
      jsondeck: '0.1',
      id: 'same-event-chain',
      title: 'Same Event Chain',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: {},
      initialState: { cards: [] },
      variables: { score: { type: 'number', initial: 0 } },
      rules: [
        { id: 'r1', on: 'game.started', then: [{ modify_var: { name: 'score', add: 1 } }] },
        {
          id: 'r2',
          on: 'game.started',
          if: { eq: ['$vars.score', 1] },
          then: [{ modify_var: { name: 'score', add: 10 } }],
        },
        {
          id: 'r3',
          on: 'game.started',
          then: [{ set_var: { name: 'score', value: '$vars.score' } }],
        },
      ],
    });

    const result = dispatchEvent(chainedRulesGame, createInitialState(chainedRulesGame), {
      type: 'game.started',
    });

    expect(result.accepted).toBe(true);
    expect(result.executedRules).toEqual(['r1', 'r2', 'r3']);
    expect(result.state.vars.score).toBe(11);
  });

  it('should handle non-existent cards gracefully', () => {
    const state = createInitialState(game);
    const result = dispatchEvent(game, state, {
      type: 'card.dropped_on_card',
      source: 'nonexistent',
      target: 'card_b_1',
      position: { x: 540, y: 320 },
    });

    expect(result.accepted).toBe(false);
    expect(result.errors.some((e) => e.code === 'UNKNOWN_CARD')).toBe(true);
  });

  it('should reject card events with unknown card or zone references before rules run', () => {
    const eventValidationGame = compileGame({
      jsondeck: '0.1',
      id: 'event-validation',
      title: 'Event Validation',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: { ct: { title: 'Card' } },
      initialState: { cards: [{ id: 'c1', type: 'ct', zone: 'z1' }] },
      variables: { score: { type: 'number', initial: 0 } },
      rules: [
        {
          id: 'should_not_run',
          on: 'card.clicked',
          then: [{ modify_var: { name: 'score', add: 1 } }],
        },
        {
          id: 'card_drop_should_not_run',
          on: 'card.dropped_on_card',
          then: [{ modify_var: { name: 'score', add: 1 } }],
        },
        {
          id: 'drop_should_not_run',
          on: 'card.dropped_on_zone',
          then: [{ modify_var: { name: 'score', add: 1 } }],
        },
        {
          id: 'empty_drop_should_not_run',
          on: 'card.dropped_on_empty',
          then: [{ modify_var: { name: 'score', add: 1 } }],
        },
      ],
    });

    const missingCard = dispatchEvent(
      eventValidationGame,
      createInitialState(eventValidationGame),
      {
        type: 'card.clicked',
        source: 'missing',
      },
    );
    expect(missingCard.accepted).toBe(false);
    expect(missingCard.errors.some((e) => e.code === 'UNKNOWN_CARD')).toBe(true);
    expect(missingCard.state.vars.score).toBe(0);

    const missingTargetCard = dispatchEvent(
      eventValidationGame,
      createInitialState(eventValidationGame),
      {
        type: 'card.dropped_on_card',
        source: 'c1',
        target: 'missing',
        position: { x: 1, y: 2 },
      },
    );
    expect(missingTargetCard.accepted).toBe(false);
    expect(missingTargetCard.errors.some((e) => e.code === 'UNKNOWN_CARD')).toBe(true);
    expect(missingTargetCard.errors.some((e) => e.path === 'target')).toBe(true);
    expect(missingTargetCard.state.vars.score).toBe(0);

    const missingTargetZone = dispatchEvent(
      eventValidationGame,
      createInitialState(eventValidationGame),
      {
        type: 'card.dropped_on_zone',
        source: 'c1',
        targetZone: 'nope',
        position: { x: 1, y: 2 },
      },
    );
    expect(missingTargetZone.accepted).toBe(false);
    expect(missingTargetZone.errors.map((e) => e.code)).toContain('UNKNOWN_ZONE');
    expect(missingTargetZone.state.vars.score).toBe(0);

    const missingEmptyZone = dispatchEvent(
      eventValidationGame,
      createInitialState(eventValidationGame),
      {
        type: 'card.dropped_on_empty',
        source: 'c1',
        zone: 'nope',
        position: { x: 1, y: 2 },
      },
    );
    expect(missingEmptyZone.accepted).toBe(false);
    expect(missingEmptyZone.errors.map((e) => e.code)).toContain('UNKNOWN_ZONE');
    expect(missingEmptyZone.state.vars.score).toBe(0);
  });

  it('should respect maxEventDepth to prevent infinite recursion', () => {
    // Create a game with self-emitting custom events
    const deepGame = compileGame({
      jsondeck: '0.1',
      id: 'deep',
      title: 'Deep',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: {},
      initialState: { cards: [] },
      rules: [
        {
          id: 'r1',
          on: 'custom.emit_test',
          then: [{ emit_event: { type: 'custom.emit_test' } }],
        },
      ],
    });

    const state = createInitialState(deepGame);
    const result = dispatchEvent(deepGame, state, { type: 'custom.emit_test' } as never);

    expect(result.errors.some((e) => e.code === 'MAX_EVENT_DEPTH_EXCEEDED')).toBe(true);
  });
});
