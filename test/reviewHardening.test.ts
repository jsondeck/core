import { describe, it, expect } from 'vitest';
import {
  compileGame,
  createInitialState,
  dispatchEvent,
  buildViewModel,
  createRuntime,
} from '../src/index.js';
import { deepCloneState } from '../src/rules/deepClone.js';

const baseGame = {
  jsondeck: '0.1',
  id: 'hardening',
  title: 'Hardening',
  table: { width: 800, height: 600, camera: { mode: 'fixed' } },
  variables: { counter: { type: 'number', initial: 0 } },
  zones: {
    main: { type: 'free_space', layout: 'free', rect: { x: 0, y: 0, w: 400, h: 300 } },
    side: { type: 'table', layout: 'row', rect: { x: 400, y: 0, w: 400, h: 300 } },
  },
  cardTypes: { unit: { title: 'Unit', tags: ['unit'] } },
  initialState: {
    cards: [
      { id: 'a', type: 'unit', zone: 'main', x: 10, y: 10 },
      { id: 'b', type: 'unit', zone: 'side' },
    ],
  },
  rules: [
    { id: 'tick_counter', on: 'game.started', then: [{ modify_var: { name: 'counter', add: 1 } }] },
  ],
} as const;

describe('validateEvent — strict field types', () => {
  const game = compileGame(baseGame);
  const dispatch = (event: unknown) =>
    dispatchEvent(game, createInitialState(game), event as never);

  it('rejects non-string source', () => {
    const r = dispatch({ type: 'card.clicked', source: 123 });
    expect(r.errors.some((e) => e.code === 'INVALID_EVENT')).toBe(true);
    expect(r.accepted).toBe(false);
  });

  it('rejects bad position coordinate types', () => {
    const r = dispatch({
      type: 'card.dropped_on_card',
      source: 'a',
      target: 'b',
      position: { x: 'nope', y: 1 },
    });
    expect(r.errors.some((e) => e.code === 'INVALID_EVENT')).toBe(true);
  });

  it('rejects non-string target / targetZone', () => {
    expect(
      dispatch({
        type: 'card.dropped_on_card',
        source: 'a',
        target: 5,
        position: { x: 1, y: 2 },
      }).errors.some((e) => e.code === 'INVALID_EVENT'),
    ).toBe(true);
    expect(
      dispatch({
        type: 'card.dropped_on_zone',
        source: 'a',
        targetZone: 9,
        position: { x: 1, y: 2 },
      }).errors.some((e) => e.code === 'INVALID_EVENT'),
    ).toBe(true);
  });

  it('rejects malformed timer.finished snapshot', () => {
    const r = dispatch({ type: 'timer.finished', timerRuntimeId: 't', timer: {} });
    expect(r.errors.some((e) => e.code === 'INVALID_EVENT')).toBe(true);
  });

  it('rejects non-object custom payload', () => {
    const r = dispatch({ type: 'custom.x', payload: 'not-an-object' });
    expect(r.errors.some((e) => e.code === 'INVALID_EVENT')).toBe(true);
  });

  it('still accepts well-typed events', () => {
    const r = dispatch({ type: 'card.clicked', source: 'a', position: { x: 1, y: 2 } });
    expect(r.errors.length).toBe(0);
  });
});

describe('Runtime — no mutable state leak', () => {
  it('getState() returns an isolated snapshot', () => {
    const rt = createRuntime(baseGame);
    const snap = rt.getState();
    snap.vars.counter = 999;
    snap.cards['a'].x = -1;
    expect(rt.getState().vars.counter).toBe(0);
    expect(rt.getState().cards['a'].x).toBe(10);
  });

  it('dispatch() result state does not alias internal state', () => {
    const rt = createRuntime(baseGame);
    const r = rt.dispatch({ type: 'game.started' });
    expect(r.state.vars.counter).toBe(1);
    r.state.vars.counter = 777;
    expect(rt.getState().vars.counter).toBe(1);
  });

  it('reset() returns an isolated snapshot', () => {
    const rt = createRuntime(baseGame);
    rt.dispatch({ type: 'game.started' });
    const fresh = rt.reset();
    fresh.vars.counter = 42;
    expect(rt.getState().vars.counter).toBe(0);
  });
});

describe('buildViewModel — resilient to missing zone state', () => {
  it('does not throw when a game zone is absent from state.zones', () => {
    const game = compileGame(baseGame);
    const state = deepCloneState(createInitialState(game));
    // Simulate a migrated / hand-built state missing a zone entirely.
    delete (state.zones as Record<string, unknown>)['side'];

    expect(() => buildViewModel(game, state)).not.toThrow();
    const vm = buildViewModel(game, state);
    const side = vm.zones.find((z) => z.id === 'side');
    expect(side?.cardIds).toEqual([]);
    // The card that lived in the missing zone is simply not rendered.
    expect(vm.cards.find((c) => c.id === 'b')).toBeUndefined();
    expect(vm.cards.find((c) => c.id === 'a')).toBeDefined();
  });
});
