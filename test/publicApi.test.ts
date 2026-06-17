import { describe, it, expect } from 'vitest';
import {
  compileGame,
  safeCompileGame,
  createInitialState,
  dispatchEvent,
  tick,
  buildViewModel,
  createRuntime,
  JsonDeckCompileError,
  JsonDeckErrorCodes,
} from '../src/index.js';
// Type-only imports verify the public type surface is exported and nameable.
import type {
  CompiledGame,
  GameState,
  GameEvent,
  DispatchResult,
  TickResult,
  GameViewModel,
  JsonDeckError,
  JsonDeckWarning,
  JsonDeckErrorCode,
  ExecutedCommandRecord,
  Runtime,
  CompileGameResult,
} from '../src/index.js';

// Minimal game used by the README quick start.
const gameJson = {
  jsondeck: '0.1',
  id: 'my-game',
  title: 'My Game',
  table: { width: 800, height: 600, camera: { mode: 'fixed' } },
  zones: { main: { type: 'free_space', layout: 'free' } },
  cardTypes: { card: { title: 'Card' } },
  initialState: { cards: [{ id: 'c1', type: 'card', zone: 'main' }] },
  rules: [],
};

describe('public API surface', () => {
  it('runs the documented quick-start end to end', () => {
    const game: CompiledGame = compileGame(gameJson);
    let state: GameState = createInitialState(game);

    const event: GameEvent = { type: 'card.clicked', source: 'c1', position: { x: 100, y: 100 } };
    const result: DispatchResult = dispatchEvent(game, state, event);
    state = result.state;

    const tickResult: TickResult = tick(game, state, 1000);
    state = tickResult.state;

    const vm: GameViewModel = buildViewModel(game, state);
    expect(vm.cards.length).toBe(1);
    expect(vm.table.width).toBe(800);
  });

  it('exposes the runtime wrapper', () => {
    const runtime: Runtime = createRuntime(gameJson);
    const before = runtime.getState();
    runtime.dispatch({ type: 'card.clicked', source: 'c1' });
    runtime.tick(100);
    expect(runtime.getViewModel().cards.length).toBe(1);
    const reset = runtime.reset();
    expect(reset.tick).toBe(0);
    expect(before.gameId).toBe('my-game');
  });

  it('safeCompileGame returns a typed result object', () => {
    const ok: CompileGameResult = safeCompileGame(gameJson);
    expect(ok.ok).toBe(true);
    const bad: CompileGameResult = safeCompileGame({ jsondeck: '0.1' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      const e: JsonDeckError = bad.errors[0];
      const w: JsonDeckWarning[] = bad.warnings;
      expect(typeof e.code).toBe('string');
      expect(Array.isArray(w)).toBe(true);
    }
  });

  it('compileGame throws a structured, summarized error', () => {
    expect.assertions(4);
    try {
      compileGame({ jsondeck: '0.1' });
    } catch (err) {
      expect(err).toBeInstanceOf(JsonDeckCompileError);
      const e = err as JsonDeckCompileError;
      expect(e.name).toBe('JsonDeckCompileError');
      expect(e.errors.length).toBeGreaterThan(0);
      // Message is enriched, not just a generic string.
      expect(e.message).toContain('Compilation failed:');
    }
  });

  it('exports a usable error-code catalog', () => {
    expect(JsonDeckErrorCodes.UNKNOWN_CARD).toBe('UNKNOWN_CARD');
    expect(JsonDeckErrorCodes.SEMANTIC_VALIDATION_ERROR).toBe('SEMANTIC_VALIDATION_ERROR');
    const code: JsonDeckErrorCode = JsonDeckErrorCodes.INVALID_EVENT;
    expect(code).toBe('INVALID_EVENT');

    // Consumers can switch on codes from a real dispatch result.
    const game = compileGame(gameJson);
    const res = dispatchEvent(game, createInitialState(game), { type: 'bad.event' } as never);
    expect(res.errors.some((x) => x.code === JsonDeckErrorCodes.INVALID_EVENT)).toBe(true);
  });

  it('exposes ExecutedCommandRecord shape on results', () => {
    const game = compileGame({
      ...gameJson,
      variables: { n: { type: 'number', initial: 0 } },
      rules: [{ id: 'r', on: 'game.started', then: [{ set_var: { name: 'n', value: 1 } }] }],
    });
    const res = dispatchEvent(game, createInitialState(game), { type: 'game.started' });
    const rec: ExecutedCommandRecord = res.commands[0];
    expect(rec.success).toBe(true);
    expect(rec.commandIndex).toBe(0);
  });
});
