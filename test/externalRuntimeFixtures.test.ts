import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  safeCompileGame,
  createInitialState,
  dispatchEvent,
  tick,
  buildViewModel,
} from '../src/index.js';

// Black-box run of the external `jsondeck-core-runtime-fixtures` suite (v1.0.0)
// against the public API. Mirrors manifest.json expectations.
const suiteDir = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'external-runtime-suite',
);
const read = (rel: string) => JSON.parse(readFileSync(join(suiteDir, rel), 'utf8'));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe('external-runtime-suite / valid', () => {
  it('V01 generic card interaction', () => {
    const c = safeCompileGame(read('valid/01_generic_card_interaction.json'));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    let s = createInitialState(c.game);
    s = dispatchEvent(c.game, s, {
      type: 'card.dropped_on_card',
      source: 'card_a_1',
      target: 'card_b_1',
      position: { x: 540, y: 320 },
    }).state;
    expect(Object.values(s.timers).some((t) => t.id === 'sample_timer')).toBe(true);
    s = tick(c.game, s, 5000).state;
    expect(s.cards['card_b_1']).toBeUndefined();
    const results = Object.values(s.cards).filter((x) => x.type === 'card_type_result');
    expect(results.map((x) => x.id).sort()).toEqual(['__jd_card_1', '__jd_card_2', '__jd_card_3']);
    expect(s.vars.counter).toBe(3);
    const vm = buildViewModel(c.game, s);
    expect(vm.hud.find((h) => h.id === 'counter')?.value).toBe(3);
  });

  it('V02 immutability probe', () => {
    const c = safeCompileGame(read('valid/02_immutability_probe.json'));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const s0 = createInitialState(c.game);
    const snap0 = clone(s0);
    const d = dispatchEvent(c.game, s0, {
      type: 'card.clicked',
      source: 'actor_1',
      position: { x: 111, y: 222 },
    });
    expect(s0).toEqual(snap0); // input not mutated
    const s1 = d.state;
    expect(s1.cards['actor_1']).toMatchObject({ zone: 'table', x: 111, y: 222, face: 'down' });
    expect(s1.vars).toMatchObject({ counter: 1, phase: 'clicked', clicked: true });
    const snap1 = clone(s1);
    const s2 = tick(c.game, s1, 50).state;
    expect(s1).toEqual(snap1); // pre-tick state not mutated
    const ids = Object.keys(s2.timers);
    expect(ids.length).toBe(1);
    expect(s2.timers[ids[0]].remainingMs).toBe(50);
    const s3 = tick(c.game, s2, 50).state;
    expect(s3.vars.counter).toBe(11);
  });

  it('V03 emit_event chain + follow-up telemetry', () => {
    const c = safeCompileGame(read('valid/03_emit_event_chain.json'));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const d = dispatchEvent(c.game, createInitialState(c.game), { type: 'game.started' });
    expect(d.state.vars).toMatchObject({ total: 4, done: true, last: 'root' });
    expect(d.executedRules).toEqual(
      expect.arrayContaining(['emit_step_one', 'handle_step_one', 'handle_step_two']),
    );
    const types = d.emittedEvents.map((e) => e.type);
    expect(types).toContain('custom.step_one');
    expect(types).toContain('custom.step_two');
  });

  it('V04 timer order + deferred timer', () => {
    const c = safeCompileGame(read('valid/04_timer_order_and_deferred.json'));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    let s = createInitialState(c.game);
    s = dispatchEvent(c.game, s, { type: 'game.started' }).state;
    expect(s.timers['__jd_timer_1']).toMatchObject({ seq: 1, id: 'first' });
    expect(s.timers['__jd_timer_2']).toMatchObject({ seq: 2, id: 'second' });
    const t = tick(c.game, s, 200);
    s = t.state;
    expect(t.processedTimers).toEqual(['__jd_timer_1', '__jd_timer_2']);
    expect(s.vars.marker).toBe(2);
    expect(Object.values(s.timers).some((x) => x.id === 'deferred')).toBe(true);
    s = tick(c.game, s, 1).state;
    expect(s.vars.marker).toBe(3);
    expect(s.vars.final).toBe(true);
  });

  it('V05 viewmodel layout + hud + theme', () => {
    const c = safeCompileGame(read('valid/05_viewmodel_layout_hud_theme.json'));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const vm = buildViewModel(c.game, createInitialState(c.game));
    expect(vm.table).toMatchObject({ width: 960, height: 720, background: '#0b6623' });
    expect(vm.cards.length).toBe(11);
    const byId = (id: string) => vm.cards.find((x) => x.id === id)!;
    expect(byId('free_1')).toMatchObject({ x: 10, y: 20, z: 5, width: 100, height: 150 });
    expect(byId('free_1').style).toMatchObject({
      borderRadius: 7,
      background: '#fefefe',
      textColor: '#222222',
    });
    expect(byId('free_2')).toMatchObject({ x: 0, y: 0, z: 0 });
    expect(byId('row_1').x).toBe(0);
    expect(byId('row_2').x).toBe(108);
    expect(byId('row_3').x).toBe(216);
    expect(byId('grid_1')).toMatchObject({ x: 600, y: 250 });
    expect(byId('grid_2')).toMatchObject({ x: 708, y: 250 });
    expect(byId('grid_3')).toMatchObject({ x: 600, y: 408 });
    expect(vm.hud.find((h) => h.id === 'score')?.value).toBe(42);
    expect(vm.hud.find((h) => h.id === 'phase')?.value).toBe('layout');
  });
});

describe('external-runtime-suite / invalid', () => {
  const cases: Array<[string, string[]]> = [
    ['invalid/01_structural_missing_required_fields.json', ['DSL_VALIDATION_ERROR']],
    ['invalid/02_duplicate_unknown_reserved_initial_cards.json', ['SEMANTIC_VALIDATION_ERROR']],
    ['invalid/03_command_multiple_keys.json', ['SEMANTIC_VALIDATION_ERROR']],
    ['invalid/04_command_bad_literal_values.json', ['SEMANTIC_VALIDATION_ERROR']],
    ['invalid/05_variables_rules_hud_semantic_errors.json', ['SEMANTIC_VALIDATION_ERROR']],
    ['invalid/06_bad_event_prefixes.json', ['SEMANTIC_VALIDATION_ERROR']],
  ];

  for (const [file, expectedCodes] of cases) {
    it(`rejects ${file}`, () => {
      let result;
      expect(() => {
        result = safeCompileGame(read(file));
      }).not.toThrow();
      expect(result!.ok).toBe(false);
      if (result!.ok) return;
      expect(result!.errors.length).toBeGreaterThan(0);
      for (const e of result!.errors) {
        expect(typeof e.code).toBe('string');
        expect(typeof e.message).toBe('string');
      }
      const codes = new Set(result!.errors.map((e) => e.code));
      for (const expected of expectedCodes) {
        expect(codes.has(expected)).toBe(true);
      }
    });
  }
});

describe('external-runtime-suite / runtime-negative', () => {
  it('R01 transaction rollback on unknown card', () => {
    const c = safeCompileGame(read('runtime-negative/01_transaction_rollback_unknown_card.json'));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const s = createInitialState(c.game);
    const snap = clone(s);
    const d = dispatchEvent(c.game, s, { type: 'card.clicked', source: 'card_1' });
    expect(d.errors.length).toBeGreaterThan(0);
    expect(d.executedRules).not.toContain('rollback_on_missing_card');
    expect(d.accepted).toBe(false);
    expect(d.state).toEqual(snap);
    expect(s).toEqual(snap);
  });

  for (const file of [
    'runtime-negative/02_set_var_type_mismatch_via_expression.json',
    'runtime-negative/03_modify_var_non_number_add_via_expression.json',
  ]) {
    it(`R02/R03 variable type safety: ${file}`, () => {
      const c = safeCompileGame(read(file));
      expect(c.ok).toBe(true);
      if (!c.ok) return;
      const s = createInitialState(c.game);
      const snap = clone(s);
      const d = dispatchEvent(c.game, s, { type: 'card.clicked', source: 'card_1' });
      const codes = d.errors.map((e) => e.code);
      expect(
        codes.includes('INVALID_VARIABLE_TYPE') || codes.includes('COMMAND_EXECUTION_ERROR'),
      ).toBe(true);
      expect(d.accepted).toBe(false);
      expect(d.state.vars.n).toBe(0);
      expect(s).toEqual(snap);
    });
  }

  it('R04 condition warnings do not execute rule', () => {
    const c = safeCompileGame(read('runtime-negative/04_conditions_warnings_no_execute.json'));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const s = createInitialState(c.game);
    const snap = clone(s);
    const d = dispatchEvent(c.game, s, { type: 'card.clicked', source: 'card_1' });
    expect(d.accepted).toBe(false);
    const wcodes = d.warnings.map((w) => w.code);
    expect(wcodes.includes('UNKNOWN_CARD') || wcodes.includes('UNKNOWN_ZONE')).toBe(true);
    expect(d.state.vars.flag).toBe(false);
    expect(s).toEqual(snap);
  });

  it('R05 max event depth loop terminates deterministically', () => {
    const c = safeCompileGame(read('runtime-negative/05_max_event_depth_loop.json'));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const d = dispatchEvent(c.game, createInitialState(c.game), {
      type: 'custom.loop',
      payload: { source: 'init' },
    });
    expect(d.errors.map((e) => e.code)).toContain('MAX_EVENT_DEPTH_EXCEEDED');
    expect(Number.isFinite(d.state.vars.counter)).toBe(true);
    expect(d.state.vars.counter).toBe(33);
  });
});
