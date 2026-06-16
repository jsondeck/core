import { describe, it, expect } from 'vitest';
import { compileGame, createInitialState } from '../src/index.js';
import { evaluateCondition } from '../src/rules/evaluateCondition.js';
import { Condition } from '../src/dsl/types.js';

describe('conditions', () => {
  const game = compileGame({
    jsondeck: '0.1',
    id: 'condition-test',
    title: 'Condition Test',
    table: { width: 800, height: 600, camera: { mode: 'fixed' } },
    zones: { z1: { type: 'free_space', layout: 'free' } },
    cardTypes: {
      ct_tagged: { title: 'Tagged', tags: ['special'] },
      ct_normal: { title: 'Normal' },
    },
    initialState: {
      cards: [
        { id: 'c1', type: 'ct_tagged', zone: 'z1' },
        { id: 'c2', type: 'ct_normal', zone: 'z1' },
      ],
    },
    rules: [],
    variables: {
      counter: { type: 'number', initial: 5 },
    },
  });

  const state = createInitialState(game);

  it('should evaluate logical "all"', () => {
    const cond: Condition = {
      all: [
        { eq: [1, 1] },
        { eq: [2, 2] },
      ],
    };

    const result = evaluateCondition(cond, state, { vars: state.vars });
    expect(result.value).toBe(true);
  });

  it('should evaluate logical "all" with failure', () => {
    const cond: Condition = {
      all: [
        { eq: [1, 1] },
        { eq: [2, 3] },
      ],
    };

    const result = evaluateCondition(cond, state, { vars: state.vars });
    expect(result.value).toBe(false);
  });

  it('should evaluate logical "any"', () => {
    const cond: Condition = {
      any: [
        { eq: [1, 2] },
        { eq: [2, 2] },
      ],
    };

    const result = evaluateCondition(cond, state, { vars: state.vars });
    expect(result.value).toBe(true);
  });

  it('should evaluate "not"', () => {
    const cond: Condition = {
      not: { eq: [1, 2] },
    };

    const result = evaluateCondition(cond, state, { vars: state.vars });
    expect(result.value).toBe(true);
  });

  it('should evaluate comparison operators', () => {
    const eq: Condition = { eq: [5, 5] };
    expect(evaluateCondition(eq, state, { vars: state.vars }).value).toBe(true);

    const gt: Condition = { gt: [10, 5] };
    expect(evaluateCondition(gt, state, { vars: state.vars }).value).toBe(true);

    const gte: Condition = { gte: [5, 5] };
    expect(evaluateCondition(gte, state, { vars: state.vars }).value).toBe(true);

    const lt: Condition = { lt: [3, 5] };
    expect(evaluateCondition(lt, state, { vars: state.vars }).value).toBe(true);

    const lte: Condition = { lte: [5, 5] };
    expect(evaluateCondition(lte, state, { vars: state.vars }).value).toBe(true);
  });

  it('should evaluate card.is condition', () => {
    const cond: Condition = { 'card.is': ['c1', 'ct_tagged'] };
    const result = evaluateCondition(cond, state, { vars: state.vars });
    expect(result.value).toBe(true);
  });

  it('should evaluate card.has_tag condition', () => {
    const cond: Condition = { 'card.has_tag': ['c1', 'special'] };
    const result = evaluateCondition(cond, state, { vars: state.vars });
    expect(result.value).toBe(true);
  });

  it('should evaluate card.in_zone condition', () => {
    const cond: Condition = { 'card.in_zone': ['c1', 'z1'] };
    const result = evaluateCondition(cond, state, { vars: state.vars });
    expect(result.value).toBe(true);
  });

  it('should evaluate zone.is_empty condition', () => {
    // Create a new state with empty zone
    const emptyGame = compileGame({
      jsondeck: '0.1',
      id: 'empty-zone',
      title: 'Empty',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: {
        z1: { type: 'free_space', layout: 'free' },
        z2: { type: 'free_space', layout: 'free' },
      },
      cardTypes: { ct: { title: 'Card' } },
      initialState: { cards: [{ id: 'c1', type: 'ct', zone: 'z1' }] },
      rules: [],
    });

    const emptyState = createInitialState(emptyGame);
    const cond: Condition = { 'zone.is_empty': 'z2' };
    const result = evaluateCondition(cond, emptyState, { vars: emptyState.vars });
    expect(result.value).toBe(true);
  });

  it('should handle unknown card gracefully', () => {
    const cond: Condition = { 'card.is': ['nonexistent', 'ct_tagged'] };
    const result = evaluateCondition(cond, state, { vars: state.vars });
    expect(result.value).toBe(false);
    expect(result.warnings.some((w) => w.code === 'UNKNOWN_CARD')).toBe(true);
  });

  it('should handle unknown zone gracefully', () => {
    const cond: Condition = { 'zone.is_empty': 'nonexistent' };
    const result = evaluateCondition(cond, state, { vars: state.vars });
    expect(result.value).toBe(false);
    expect(result.warnings.some((w) => w.code === 'UNKNOWN_ZONE')).toBe(true);
  });

  it('should resolve variable expressions', () => {
    const cond: Condition = { gt: ['$vars.counter', 3] };
    const result = evaluateCondition(cond, state, { vars: state.vars });
    expect(result.value).toBe(true);
  });

  it('should handle nested expressions', () => {
    const cond: Condition = {
      all: [
        { 'card.has_tag': ['$source', 'special'] },
        { eq: ['$vars.counter', 5] },
      ],
    };

    const result = evaluateCondition(cond, state, {
      source: 'c1',
      vars: state.vars,
    });

    expect(result.value).toBe(true);
  });
});
