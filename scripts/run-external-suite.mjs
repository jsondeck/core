// Black-box runner for the external jsondeck-core-runtime-fixtures suite.
// Imports ONLY the published surface from the built dist/.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  safeCompileGame,
  createInitialState,
  dispatchEvent,
  tick,
  buildViewModel,
} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const suiteDir = join(here, '..', 'test', 'fixtures', 'external-runtime-suite');
const read = (rel) => JSON.parse(readFileSync(join(suiteDir, rel), 'utf8'));
const clone = (v) => JSON.parse(JSON.stringify(v));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const results = [];
function record(id, fixture, o) {
  results.push({ id, fixture, ...o });
}

// ---------------- VALID ----------------

// V01
(() => {
  const id = 'V01';
  const file = 'valid/01_generic_card_interaction.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  let s = createInitialState(c.game);
  const d = dispatchEvent(c.game, s, {
    type: 'card.dropped_on_card',
    source: 'card_a_1',
    target: 'card_b_1',
    position: { x: 540, y: 320 },
  });
  s = d.state;
  const timerCreated = Object.values(s.timers).some((t) => t.id === 'sample_timer');
  checks.push(['timer sample_timer created', timerCreated]);
  const t = tick(c.game, s, 5000);
  s = t.state;
  checks.push(['card_b_1 removed', s.cards['card_b_1'] === undefined]);
  const resultCards = Object.values(s.cards).filter((x) => x.type === 'card_type_result');
  checks.push(['3 result cards', resultCards.length === 3]);
  checks.push([
    'ids __jd_card_1..3',
    eq(resultCards.map((x) => x.id).sort(), ['__jd_card_1', '__jd_card_2', '__jd_card_3']),
  ]);
  checks.push(['counter===3', s.vars.counter === 3]);
  const vm = buildViewModel(c.game, s);
  const hudCounter = vm.hud.find((h) => h.id === 'counter');
  checks.push(['HUD counter===3', hudCounter?.value === 3]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
    counter: s.vars.counter,
  });
})();

// V02
(() => {
  const id = 'V02';
  const file = 'valid/02_immutability_probe.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  const s0 = createInitialState(c.game);
  const snap0 = clone(s0);
  const d = dispatchEvent(c.game, s0, {
    type: 'card.clicked',
    source: 'actor_1',
    position: { x: 111, y: 222 },
  });
  checks.push(['input unchanged after dispatch', eq(s0, snap0)]);
  const s1 = d.state;
  const actor = s1.cards['actor_1'];
  checks.push(['actor_1 -> table', actor.zone === 'table']);
  checks.push(['actor_1 pos 111,222', actor.x === 111 && actor.y === 222]);
  checks.push(['actor_1 face down', actor.face === 'down']);
  checks.push(['counter 1', s1.vars.counter === 1]);
  checks.push(['phase clicked', s1.vars.phase === 'clicked']);
  checks.push(['clicked true', s1.vars.clicked === true]);
  const snap1 = clone(s1);
  const t1 = tick(c.game, s1, 50);
  checks.push(['pre-tick state unchanged', eq(s1, snap1)]);
  const s2 = t1.state;
  const timerIds = Object.keys(s2.timers);
  checks.push(['one timer remains', timerIds.length === 1]);
  checks.push([
    'remainingMs 50',
    timerIds.length === 1 && s2.timers[timerIds[0]].remainingMs === 50,
  ]);
  const t2 = tick(c.game, s2, 50);
  const s3 = t2.state;
  checks.push(['counter 11', s3.vars.counter === 11]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
  });
})();

// V03
(() => {
  const id = 'V03';
  const file = 'valid/03_emit_event_chain.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  const s = createInitialState(c.game);
  const d = dispatchEvent(c.game, s, { type: 'game.started' });
  checks.push(['total===4', d.state.vars.total === 4]);
  checks.push(['done===true', d.state.vars.done === true]);
  checks.push(['last===root', d.state.vars.last === 'root']);
  checks.push([
    'executedRules has all three',
    ['emit_step_one', 'handle_step_one', 'handle_step_two'].every((r) =>
      d.executedRules.includes(r),
    ),
  ]);
  const emittedTypes = d.emittedEvents.map((e) => e.type);
  checks.push(['emittedEvents has step_one', emittedTypes.includes('custom.step_one')]);
  checks.push(['emittedEvents has step_two', emittedTypes.includes('custom.step_two')]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
    executedRules: d.executedRules,
    emittedTypes,
  });
})();

// V04
(() => {
  const id = 'V04';
  const file = 'valid/04_timer_order_and_deferred.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  let s = createInitialState(c.game);
  const d = dispatchEvent(c.game, s, { type: 'game.started' });
  s = d.state;
  const t1 = s.timers['__jd_timer_1'];
  const t2 = s.timers['__jd_timer_2'];
  checks.push(['timer_1 seq=1 id first', t1?.seq === 1 && t1?.id === 'first']);
  checks.push(['timer_2 seq=2 id second', t2?.seq === 2 && t2?.id === 'second']);
  const tk = tick(c.game, s, 200);
  s = tk.state;
  checks.push(['processed in seq order', eq(tk.processedTimers, ['__jd_timer_1', '__jd_timer_2'])]);
  checks.push(['marker===2', s.vars.marker === 2]);
  const deferred = Object.values(s.timers).find((t) => t.id === 'deferred');
  checks.push(['deferred pending after tick200', !!deferred]);
  const tk2 = tick(c.game, s, 1);
  s = tk2.state;
  checks.push(['marker===3', s.vars.marker === 3]);
  checks.push(['final===true', s.vars.final === true]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
    processedTimers: tk.processedTimers,
  });
})();

// V05
(() => {
  const id = 'V05';
  const file = 'valid/05_viewmodel_layout_hud_theme.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  const s = createInitialState(c.game);
  const vm = buildViewModel(c.game, s);
  checks.push([
    'table 960x720 #0b6623',
    vm.table.width === 960 && vm.table.height === 720 && vm.table.background === '#0b6623',
  ]);
  checks.push(['11 cards', vm.cards.length === 11]);
  const free1 = vm.cards.find((x) => x.id === 'free_1');
  const free2 = vm.cards.find((x) => x.id === 'free_2');
  checks.push([
    'card size 100x150 + theme',
    free1.width === 100 &&
      free1.height === 150 &&
      free1.style.borderRadius === 7 &&
      free1.style.background === '#fefefe' &&
      free1.style.textColor === '#222222',
  ]);
  checks.push(['free_1 at 10,20,z=5', free1.x === 10 && free1.y === 20 && free1.z === 5]);
  checks.push(['free_2 at 0,0,z=0', free2.x === 0 && free2.y === 0 && free2.z === 0]);
  // row positions: row_zone rect.x=0, gap=8, card width 100 -> 0,108,216
  const row1 = vm.cards.find((x) => x.id === 'row_1');
  const row2 = vm.cards.find((x) => x.id === 'row_2');
  const row3 = vm.cards.find((x) => x.id === 'row_3');
  checks.push([
    'row gap=8 positions',
    row1.x === 0 && row2.x === 108 && row3.x === 216 && row1.y === 250,
  ]);
  // grid: grid_zone rect x=600 y=250 w=260; cols=floor(260/(100+8))=2; rows of 2
  const g1 = vm.cards.find((x) => x.id === 'grid_1');
  const g2 = vm.cards.find((x) => x.id === 'grid_2');
  const g3 = vm.cards.find((x) => x.id === 'grid_3');
  checks.push([
    'grid 2-col layout',
    g1.x === 600 && g1.y === 250 && g2.x === 708 && g2.y === 250 && g3.x === 600 && g3.y === 408,
  ]);
  const hudScore = vm.hud.find((h) => h.id === 'score');
  const hudPhase = vm.hud.find((h) => h.id === 'phase');
  checks.push([
    'HUD score 42 phase layout',
    hudScore?.value === 42 && hudPhase?.value === 'layout',
  ]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
    free2,
  });
})();

// ---------------- INVALID ----------------
const invalidCases = [
  ['I01', 'invalid/01_structural_missing_required_fields.json'],
  ['I02', 'invalid/02_duplicate_unknown_reserved_initial_cards.json'],
  ['I03', 'invalid/03_command_multiple_keys.json'],
  ['I04', 'invalid/04_command_bad_literal_values.json'],
  ['I05', 'invalid/05_variables_rules_hud_semantic_errors.json'],
  ['I06', 'invalid/06_bad_event_prefixes.json'],
];
for (const [id, file] of invalidCases) {
  let threw = false;
  let r;
  try {
    r = safeCompileGame(read(file));
  } catch (e) {
    threw = true;
    r = { ok: true };
  }
  const ok = !threw && r.ok === false;
  const codes = ok ? [...new Set(r.errors.map((e) => e.code))] : [];
  const structured = ok ? r.errors.every((e) => e.code && e.message) : false;
  record(id, file, {
    compile: r.ok === false ? 'rejected' : 'accepted',
    threw,
    verdict: ok && structured ? 'PASS' : 'FAIL',
    errorCount: ok ? r.errors.length : 0,
    codes,
    samplePaths: ok ? r.errors.slice(0, 8).map((e) => ({ code: e.code, path: e.path })) : [],
  });
}

// ---------------- RUNTIME-NEGATIVE ----------------

// R01
(() => {
  const id = 'R01';
  const file = 'runtime-negative/01_transaction_rollback_unknown_card.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  const s = createInitialState(c.game);
  const snap = clone(s);
  const d = dispatchEvent(c.game, s, { type: 'card.clicked', source: 'card_1' });
  checks.push(['has errors', d.errors.length > 0]);
  checks.push(['rule not executed', !d.executedRules.includes('rollback_on_missing_card')]);
  checks.push(['returned state == initial', eq(d.state, snap)]);
  checks.push(['input unchanged', eq(s, snap)]);
  checks.push(['accepted false', d.accepted === false]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
    errorCodes: d.errors.map((e) => e.code),
  });
})();

// R02 & R03 share shape
for (const [id, file, varName] of [
  ['R02', 'runtime-negative/02_set_var_type_mismatch_via_expression.json', 'n'],
  ['R03', 'runtime-negative/03_modify_var_non_number_add_via_expression.json', 'n'],
]) {
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) {
    record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
    continue;
  }
  const s = createInitialState(c.game);
  const snap = clone(s);
  const d = dispatchEvent(c.game, s, { type: 'card.clicked', source: 'card_1' });
  const codes = d.errors.map((e) => e.code);
  checks.push([
    'error INVALID_VARIABLE_TYPE/COMMAND_EXECUTION_ERROR',
    codes.includes('INVALID_VARIABLE_TYPE') || codes.includes('COMMAND_EXECUTION_ERROR'),
  ]);
  checks.push(['accepted false', d.accepted === false]);
  checks.push([`vars.${varName} remains 0`, d.state.vars[varName] === 0]);
  checks.push(['input unchanged', eq(s, snap)]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
    errorCodes: codes,
  });
}

// R04
(() => {
  const id = 'R04';
  const file = 'runtime-negative/04_conditions_warnings_no_execute.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  const s = createInitialState(c.game);
  const snap = clone(s);
  const d = dispatchEvent(c.game, s, { type: 'card.clicked', source: 'card_1' });
  const wcodes = d.warnings.map((w) => w.code);
  checks.push(['accepted false', d.accepted === false]);
  checks.push([
    'warnings UNKNOWN_CARD/ZONE',
    wcodes.includes('UNKNOWN_CARD') || wcodes.includes('UNKNOWN_ZONE'),
  ]);
  checks.push(['flag remains false', d.state.vars.flag === false]);
  checks.push(['input unchanged', eq(s, snap)]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
    warningCodes: wcodes,
  });
})();

// R05
(() => {
  const id = 'R05';
  const file = 'runtime-negative/05_max_event_depth_loop.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  const s = createInitialState(c.game);
  const start = Date.now();
  const d = dispatchEvent(c.game, s, { type: 'custom.loop', payload: { source: 'init' } });
  const elapsed = Date.now() - start;
  const codes = d.errors.map((e) => e.code);
  checks.push(['terminates < 2s', elapsed < 2000]);
  checks.push(['MAX_EVENT_DEPTH_EXCEEDED', codes.includes('MAX_EVENT_DEPTH_EXCEEDED')]);
  checks.push(['counter finite', Number.isFinite(d.state.vars.counter)]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
    counter: d.state.vars.counter,
    elapsedMs: elapsed,
  });
})();

// V06 — $-expression references in command literals (edge addition)
(() => {
  const id = 'V06';
  const file = 'valid/06_expression_references_in_commands.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  const d = dispatchEvent(c.game, createInitialState(c.game), { type: 'game.started' });
  checks.push(['accepted', d.accepted === true]);
  checks.push(['no errors', d.errors.length === 0]);
  const mover = d.state.cards['mover_1'];
  checks.push([
    'mover_1 -> target_zone 50,60',
    mover.zone === 'target_zone' && mover.x === 50 && mover.y === 60,
  ]);
  const spawned = Object.values(d.state.cards).filter((x) => x.type === 'spawned');
  checks.push([
    '2 spawned in target_zone',
    spawned.length === 2 && spawned.every((x) => x.zone === 'target_zone'),
  ]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
  });
})();

// R06 — move_card bad coordinate type (edge addition)
(() => {
  const id = 'R06';
  const file = 'runtime-negative/06_move_card_bad_coordinate_type.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  const s = createInitialState(c.game);
  const snap = clone(s);
  const d = dispatchEvent(c.game, s, { type: 'card.clicked', source: 'card_1' });
  checks.push([
    'COMMAND_EXECUTION_ERROR',
    d.errors.map((e) => e.code).includes('COMMAND_EXECUTION_ERROR'),
  ]);
  checks.push(['accepted false', d.accepted === false]);
  checks.push(['marker rolled back to 0', d.state.vars.marker === 0]);
  checks.push(['card_1 stays in zone_a', d.state.cards['card_1'].zone === 'zone_a']);
  checks.push(['input unchanged', eq(s, snap)]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
  });
})();

// R07 — invalid event shapes (edge addition)
(() => {
  const id = 'R07';
  const file = 'runtime-negative/07_invalid_event_shape.json';
  const checks = [];
  const c = safeCompileGame(read(file));
  if (!c.ok) return record(id, file, { compile: 'fail', verdict: 'FAIL', errors: c.errors });
  const s = createInitialState(c.game);
  const snap = clone(s);
  for (const bad of [null, {}, { type: 123 }]) {
    let threw = false;
    let d;
    try {
      d = dispatchEvent(c.game, s, bad);
    } catch {
      threw = true;
    }
    checks.push([`no throw for ${JSON.stringify(bad)}`, !threw]);
    checks.push([
      `INVALID_EVENT for ${JSON.stringify(bad)}`,
      !threw && d.errors.some((e) => e.code === 'INVALID_EVENT'),
    ]);
  }
  checks.push(['flag false', s.vars.flag === false]);
  checks.push(['input unchanged', eq(s, snap)]);
  const pass = checks.every(([, ok]) => ok);
  record(id, file, {
    compile: 'ok',
    runtime: pass ? 'ok' : 'fail',
    verdict: pass ? 'PASS' : 'FAIL',
    checks,
  });
})();

console.log(JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.verdict !== 'PASS');
console.log('\n=== SUMMARY ===');
console.log(`PASS: ${results.filter((r) => r.verdict === 'PASS').length}/${results.length}`);
if (failed.length) console.log('FAILED:', failed.map((f) => f.id).join(', '));
