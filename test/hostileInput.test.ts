import { describe, it, expect } from 'vitest';
import {
  compileGame,
  safeCompileGame,
  createInitialState,
  dispatchEvent,
  tick,
  buildViewModel,
  safeBuildViewModel,
  validateState,
  createRuntime,
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

describe('Runtime — nested timer bind is deeply isolated', () => {
  it('mutating a nested bind in a snapshot does not leak into internal state', () => {
    const rt = createRuntime({
      jsondeck: '0.1',
      id: 'bind',
      title: 'Bind',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z: { type: 'free_space', layout: 'free' } },
      cardTypes: { u: { title: 'U', tags: ['actor'] } },
      initialState: { cards: [{ id: 'c1', type: 'u', zone: 'z' }] },
      rules: [
        {
          id: 'r',
          on: 'card.clicked',
          then: [
            {
              start_timer: {
                id: 't',
                duration_ms: 1000,
                bind: { nested: { value: 1 }, arr: [1, 2] },
              },
            },
          ],
        },
      ],
    });
    rt.dispatch({ type: 'card.clicked', source: 'c1' });
    const snap = rt.getState();
    const tid = Object.keys(snap.timers)[0];
    (snap.timers[tid].bind.nested as { value: number }).value = 999;
    (snap.timers[tid].bind.arr as number[]).push(3);

    const after = rt.getState();
    expect((after.timers[tid].bind.nested as { value: number }).value).toBe(1);
    expect((after.timers[tid].bind.arr as number[]).length).toBe(2);
  });
});

describe('non-finite numbers are rejected everywhere', () => {
  const withVarInitial = (initial: unknown) => ({
    jsondeck: '0.1',
    id: 'fin',
    title: 'Fin',
    variables: { d: { type: 'number', initial } },
    table: { width: 800, height: 600, camera: { mode: 'fixed' } },
    zones: { z: { type: 'free_space', layout: 'free' } },
    cardTypes: { u: { title: 'U' } },
    initialState: { cards: [] },
    rules: [],
  });

  it('rejects Infinity / NaN variable initials at compile', () => {
    expect(safeCompileGame(withVarInitial(Infinity)).ok).toBe(false);
    expect(safeCompileGame(withVarInitial(-Infinity)).ok).toBe(false);
    expect(safeCompileGame(withVarInitial(NaN)).ok).toBe(false);
    expect(safeCompileGame(withVarInitial(0)).ok).toBe(true);
  });

  it('rejects a non-finite literal start_timer.duration_ms at compile', () => {
    const r = safeCompileGame({
      ...withVarInitial(0),
      rules: [
        {
          id: 'r',
          on: 'game.started',
          then: [{ start_timer: { id: 't', duration_ms: Infinity } }],
        },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it('rejects a non-finite duration resolved from an event payload at runtime', () => {
    const g = compileGame({
      ...withVarInitial(0),
      cardTypes: { u: { title: 'U' } },
      initialState: { cards: [] },
      rules: [
        {
          id: 'r',
          on: 'custom.go',
          then: [{ start_timer: { id: 't', duration_ms: '$event.payload.dur' } }],
        },
      ],
    });
    const r = dispatchEvent(g, createInitialState(g), {
      type: 'custom.go',
      payload: { dur: Infinity },
    });
    expect(r.accepted).toBe(false);
    expect(r.errors.some((e) => e.code === 'COMMAND_EXECUTION_ERROR')).toBe(true);
    expect(Object.keys(r.state.timers).length).toBe(0);
  });

  it('validateState flags a non-finite number variable', () => {
    const g = compileGame(withVarInitial(0));
    const s = deepCloneState(createInitialState(g));
    (s.vars as Record<string, unknown>)['d'] = Infinity;
    const v = validateState(g, s);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.path === 'vars.d')).toBe(true);
  });

  it('rejects non-finite theme numbers at compile', () => {
    const base = withVarInitial(0);
    expect(safeCompileGame({ ...base, theme: { card: { width: Infinity } } }).ok).toBe(false);
    expect(safeCompileGame({ ...base, theme: { font: { size: NaN } } }).ok).toBe(false);
  });
});

describe('expression-resolved objects are isolated (no aliasing into state)', () => {
  const aliasGame = (then: unknown[]) => ({
    jsondeck: '0.1',
    id: 'alias',
    title: 'Alias',
    table: { width: 800, height: 600, camera: { mode: 'fixed' } },
    zones: { z: { type: 'free_space', layout: 'free' } },
    cardTypes: { u: { title: 'U' } },
    initialState: { cards: [{ id: 'c1', type: 'u', zone: 'z' }] },
    rules: [{ id: 'r', on: 'custom.go', then }],
  });

  it('start_timer.bind from $event.payload does not alias the source (pure dispatch)', () => {
    const g = compileGame(
      aliasGame([{ start_timer: { id: 't', duration_ms: 1000, bind: { p: '$event.payload' } } }]),
    );
    const payload = { nested: { value: 1 }, arr: [1, 2] };
    const r = dispatchEvent(g, createInitialState(g), { type: 'custom.go', payload });
    const tid = Object.keys(r.state.timers)[0];
    payload.nested.value = 999;
    payload.arr.push(3);
    const bound = r.state.timers[tid].bind.p as { nested: { value: number }; arr: number[] };
    expect(bound.nested.value).toBe(1);
    expect(bound.arr.length).toBe(2);
  });

  it('start_timer.bind from $event.payload does not alias internal runtime state', () => {
    const rt = createRuntime(
      aliasGame([{ start_timer: { id: 't', duration_ms: 1000, bind: { p: '$event.payload' } } }]),
    );
    const payload = { nested: { value: 1 } };
    rt.dispatch({ type: 'custom.go', payload });
    payload.nested.value = 777;
    const tid = Object.keys(rt.getState().timers)[0];
    const bound = rt.getState().timers[tid].bind.p as { nested: { value: number } };
    expect(bound.nested.value).toBe(1);
  });

  it('emit_event.payload from $event.payload does not alias the source', () => {
    const g = compileGame(
      aliasGame([{ emit_event: { type: 'custom.echo', payload: { p: '$event.payload' } } }]),
    );
    const payload = { nested: { value: 1 } };
    const r = dispatchEvent(g, createInitialState(g), { type: 'custom.go', payload });
    payload.nested.value = 555;
    const echo = r.emittedEvents.find((e) => e.type === 'custom.echo') as {
      payload?: { p?: { nested?: { value?: number } } };
    };
    expect(echo?.payload?.p?.nested?.value).toBe(1);
  });
});

describe('validateState — timers', () => {
  it('flags a timer with a non-finite duration in a restored state', () => {
    const g = compileGame({
      jsondeck: '0.1',
      id: 'tmr',
      title: 'Tmr',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z: { type: 'free_space', layout: 'free' } },
      cardTypes: { u: { title: 'U' } },
      initialState: { cards: [] },
      rules: [],
    });
    const s = deepCloneState(createInitialState(g));
    s.timers['__jd_timer_1'] = {
      runtimeId: '__jd_timer_1',
      seq: 1,
      id: 't',
      durationMs: Infinity,
      remainingMs: Infinity,
      bind: {},
    };
    const v = validateState(g, s);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.path === 'timers.__jd_timer_1.durationMs')).toBe(true);
  });
});
