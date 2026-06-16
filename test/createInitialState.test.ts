import { describe, it, expect } from 'vitest';
import { compileGame, createInitialState } from '../src/index.js';
import fixtureData from './fixtures/generic-card-interaction.json';

describe('createInitialState', () => {
  const game = compileGame(fixtureData);

  it('should create initial state with correct meta', () => {
    const state = createInitialState(game);
    expect(state.gameId).toBe('generic-card-interaction');
    expect(state.tick).toBe(0);
    expect(state.nowMs).toBe(0);
    expect(state.meta.nextCardSeq).toBe(1);
    expect(state.meta.nextTimerSeq).toBe(1);
  });

  it('should initialize variables with correct values', () => {
    const state = createInitialState(game);
    expect(state.vars.counter).toBe(0);
    expect(state.vars.phase).toBe('default_phase');
  });

  it('should create card instances with props and tags', () => {
    const state = createInitialState(game);
    expect(state.cards['card_a_1']).toBeDefined();
    expect(state.cards['card_a_1'].type).toBe('card_type_actor');
    expect(state.cards['card_a_1'].props.power).toBe(1);
    expect(state.cards['card_a_1'].tags).toContain('actor');
  });

  it('should create zones with correct cardIds', () => {
    const state = createInitialState(game);
    expect(state.zones['main_zone'].cardIds).toContain('card_a_1');
    expect(state.zones['main_zone'].cardIds).toContain('card_b_1');
    expect(state.zones['main_zone'].cardIds.length).toBe(2);
  });

  it('should use default face value "up" for cards', () => {
    const state = createInitialState(game);
    expect(state.cards['card_a_1'].face).toBe('up');
  });

  it('should initialize timers as empty', () => {
    const state = createInitialState(game);
    expect(Object.keys(state.timers).length).toBe(0);
  });

  it('should preserve card coordinates', () => {
    const state = createInitialState(game);
    expect(state.cards['card_a_1'].x).toBe(220);
    expect(state.cards['card_a_1'].y).toBe(320);
  });
});
