import { describe, it, expect } from 'vitest';
import {
  compileGame,
  createInitialState,
  dispatchEvent,
  tick,
  buildViewModel,
  safeBuildViewModel,
  validateState,
  RUNTIME_LIMITS,
} from '../src/index.js';
import { deepCloneState } from '../src/rules/deepClone.js';

function game(rules: unknown[], extra: Record<string, unknown> = {}) {
  return compileGame({
    jsondeck: '0.1',
    id: 'hostile',
    title: 'Hostile',
    table: { width: 800, height: 600, camera: { mode: 'fixed' } },
    variables: { n: { type: 'number', initial: 0 } },
    zones: {
      z1: { type: 'free_space', layout: 'free', rect: { x: 0, y: 0, w: 400, h: 300 } },
      z2: { type: 'table', layout: 'row', rect: { x: 400, y: 0, w: 400, h: 300 } },
    },
    cardTypes: { unit: { title: 'Unit', tags: ['u'] } },
    initialState: { cards: [{ id: 'c1', type: 'unit', zone: 'z1', x: 0, y: 0 }] },
    rules,
    ...extra,
  });
}

describe('hostile input — numeric extremes', () => {
  it('rejects NaN / Infinity / negative tick deltas without changing state', () => {
    const g = game([]);
    const s = createInitialState(g);
    const snap = deepCloneState(s);
    for (const delta of [NaN, Infinity, -1, -Infinity]) {
      const r = tick(g, s, delta);
      expect(r.errors.some((e) => e.code === 'INVALID_TICK_DELTA')).toBe(true);
      expect(r.state).toEqual(snap);
    }
    expect(s).toEqual(snap);
  });

  it('rejects Infinity assigned to a number variable (set_var)', () => {
    const g = game([
      { id: 'r', on: 'game.started', then: [{ set_var: { name: 'n', value: Infinity } }] },
    ]);
    const r = dispatchEvent(g, createInitialState(g), { type: 'game.started' });
    expect(r.accepted).toBe(false);
    expect(r.errors.some((e) => e.code === 'INVALID_VARIABLE_TYPE')).toBe(true);
  });

  it('rejects non-finite modify_var add and overflow', () => {
    const g = game([
      { id: 'r', on: 'game.started', then: [{ modify_var: { name: 'n', add: Infinity } }] },
    ]);
    const r = dispatchEvent(g, createInitialState(g), { type: 'game.started' });
    expect(r.accepted).toBe(false);
    expect(r.errors.some((e) => e.code === 'INVALID_VARIABLE_TYPE')).toBe(true);
    expect(r.state.vars.n).toBe(0);
  });

  it('rejects NaN/Infinity move_card coordinates and rolls back', () => {
    const g = game([
      {
        id: 'r',
        on: 'card.clicked',
        then: [
          { modify_var: { name: 'n', add: 1 } },
          { move_card: { card: '$source', to_zone: 'z2', x: NaN, y: 5 } },
        ],
      },
    ]);
    const r = dispatchEvent(g, createInitialState(g), { type: 'card.clicked', source: 'c1' });
    expect(r.accepted).toBe(false);
    expect(r.errors.some((e) => e.code === 'COMMAND_EXECUTION_ERROR')).toBe(true);
    expect(r.state.vars.n).toBe(0); // rolled back
    expect(r.state.cards['c1'].zone).toBe('z1'); // not moved
  });
});

describe('hostile input — deep payload', () => {
  it('caps expression nesting at maxExpressionDepth without overflowing', () => {
    // Build a payload nested far beyond the limit.
    let payload: Record<string, unknown> = { leaf: '$source' };
    for (let i = 0; i < RUNTIME_LIMITS.maxExpressionDepth + 10; i++) {
      payload = { nested: payload };
    }
    const g = game([
      { id: 'emit', on: 'card.clicked', then: [{ emit_event: { type: 'custom.deep', payload } }] },
    ]);
    let result;
    expect(() => {
      result = dispatchEvent(g, createInitialState(g), { type: 'card.clicked', source: 'c1' });
    }).not.toThrow();
    expect(result!.warnings.some((w) => w.code === 'EXPRESSION_RESOLUTION_ERROR')).toBe(true);
  });
});

describe('validateState', () => {
  it('accepts a freshly created state', () => {
    const g = game([]);
    expect(validateState(g, createInitialState(g)).ok).toBe(true);
  });

  it('flags a missing zone state', () => {
    const g = game([]);
    const s = deepCloneState(createInitialState(g));
    delete (s.zones as Record<string, unknown>)['z2'];
    const v = validateState(g, s);
    expect(v.ok).toBe(false);
    expect(v.errors.every((e) => e.code === 'INVALID_STATE')).toBe(true);
    expect(v.errors.some((e) => e.path === 'zones.z2')).toBe(true);
  });

  it('flags a wrong variable type', () => {
    const g = game([]);
    const s = deepCloneState(createInitialState(g));
    (s.vars as Record<string, unknown>)['n'] = 'not-a-number';
    expect(validateState(g, s).ok).toBe(false);
  });

  it('flags a card/zone inconsistency', () => {
    const g = game([]);
    const s = deepCloneState(createInitialState(g));
    s.cards['c1'].zone = 'z2'; // card says z2 but z1 still lists it and z2 does not
    const v = validateState(g, s);
    expect(v.ok).toBe(false);
  });
});

describe('safeBuildViewModel', () => {
  it('returns ok:true with a view model for a valid state', () => {
    const g = game([]);
    const r = safeBuildViewModel(g, createInitialState(g));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.viewModel.cards.length).toBe(1);
  });

  it('returns ok:false with structured errors for an inconsistent state', () => {
    const g = game([]);
    const s = deepCloneState(createInitialState(g));
    delete (s.zones as Record<string, unknown>)['z1'];
    const r = safeBuildViewModel(g, s);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThan(0);
      expect(r.errors.every((e) => e.code === 'INVALID_STATE')).toBe(true);
    }
    // The unsafe variant must still not throw.
    expect(() => buildViewModel(g, s)).not.toThrow();
  });
});
