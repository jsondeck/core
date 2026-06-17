import { describe, it, expect } from 'vitest';
import { compileGame, safeCompileGame, JsonDeckCompileError } from '../src/index.js';
import fixtureData from './fixtures/generic-card-interaction.json';

describe('compileGame', () => {
  it('should compile valid fixture', () => {
    const game = compileGame(fixtureData);
    expect(game.id).toBe('generic-card-interaction');
    expect(game.title).toBe('Пример взаимодействия карт');
    expect(Object.keys(game.variables)).toContain('counter');
    expect(Object.keys(game.cardTypes)).toContain('card_type_actor');
    expect(Object.keys(game.zones)).toContain('main_zone');
    expect(game.rules.length).toBe(2);
  });

  it('should throw JsonDeckCompileError on structural validation failure', () => {
    const invalid = {
      jsondeck: '0.2', // Wrong version
      id: 'test',
      title: 'Test',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: {},
      cardTypes: {},
      initialState: { cards: [] },
      rules: [],
    };

    expect(() => compileGame(invalid)).toThrow(JsonDeckCompileError);
  });

  it('should throw JsonDeckCompileError on semantic validation failure', () => {
    const invalid = {
      jsondeck: '0.1',
      id: 'test',
      title: 'Test',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: {},
      cardTypes: {},
      initialState: { cards: [{ id: 'c1', type: 'unknown_type', zone: 'unknown_zone' }] },
      rules: [],
    };

    expect(() => compileGame(invalid)).toThrow(JsonDeckCompileError);
  });

  it('should validate duplicate card IDs', () => {
    const invalid = {
      jsondeck: '0.1',
      id: 'test',
      title: 'Test',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: { ct: { title: 'Card' } },
      initialState: {
        cards: [
          { id: 'c1', type: 'ct', zone: 'z1' },
          { id: 'c1', type: 'ct', zone: 'z1' },
        ],
      },
      rules: [],
    };

    expect(() => compileGame(invalid)).toThrow(JsonDeckCompileError);
  });

  it('should validate create_card count validation', () => {
    const invalid = {
      jsondeck: '0.1',
      id: 'test',
      title: 'Test',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: { ct: { title: 'Card' } },
      initialState: { cards: [] },
      rules: [
        {
          id: 'r1',
          on: 'game.started',
          then: [{ create_card: { type: 'ct', zone: 'z1', count: 0 } }], // Invalid count
        },
      ],
    };

    expect(() => compileGame(invalid)).toThrow(JsonDeckCompileError);
  });

  it('should validate create_card with non-integer count', () => {
    const invalid = {
      jsondeck: '0.1',
      id: 'test',
      title: 'Test',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: { ct: { title: 'Card' } },
      initialState: { cards: [] },
      rules: [
        {
          id: 'r1',
          on: 'game.started',
          then: [{ create_card: { type: 'ct', zone: 'z1', count: 1.5 } }],
        },
      ],
    };

    expect(() => compileGame(invalid)).toThrow(JsonDeckCompileError);
  });

  it('should reject comparison/card conditions with the wrong number of operands', () => {
    const invalid = {
      jsondeck: '0.1',
      id: 'bad-condition-arity',
      title: 'Bad Condition Arity',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: { ct: { title: 'Card' } },
      initialState: { cards: [{ id: 'c1', type: 'ct', zone: 'z1' }] },
      rules: [
        {
          id: 'r1',
          on: 'game.started',
          if: { eq: [1] },
          then: [],
        },
        {
          id: 'r2',
          on: 'game.started',
          if: { 'card.in_zone': ['c1', 'z1', 'extra'] },
          then: [],
        },
      ],
    };

    const result = safeCompileGame(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.filter((e) => e.code === 'SEMANTIC_VALIDATION_ERROR').length).toBe(2);
      expect(result.errors.every((e) => e.path?.includes('.if'))).toBe(true);
    }
  });

  it('should reject zone.is_empty array syntax', () => {
    const invalid = {
      jsondeck: '0.1',
      id: 'bad-zone-condition-arity',
      title: 'Bad Zone Condition Arity',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: {},
      initialState: { cards: [] },
      rules: [
        {
          id: 'r1',
          on: 'game.started',
          if: { 'zone.is_empty': ['z1', 'z2'] },
          then: [],
        },
      ],
    };

    const result = safeCompileGame(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message.includes('zone.is_empty'))).toBe(true);
    }
  });
});

describe('safeCompileGame', () => {
  it('should return ok: true for valid fixture', () => {
    const result = safeCompileGame(fixtureData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.game.id).toBe('generic-card-interaction');
    }
  });

  it('should return ok: false for invalid DSL', () => {
    const invalid = { jsondeck: '0.2' };
    const result = safeCompileGame(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('should never throw exceptions', () => {
    expect(() => safeCompileGame(null)).not.toThrow();
    expect(() => safeCompileGame(undefined)).not.toThrow();
    expect(() => safeCompileGame(123)).not.toThrow();
  });

  it('should normalize optional fields', () => {
    const minimal = {
      jsondeck: '0.1',
      id: 'test',
      title: 'Test',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: { z1: { type: 'free_space', layout: 'free' } },
      cardTypes: {},
      initialState: { cards: [] },
      rules: [],
    };

    const result = safeCompileGame(minimal);
    if (result.ok) {
      expect(result.game.variables).toEqual({});
      expect(result.game.hud).toEqual([]);
      expect(result.game.theme).toEqual({});
    }
  });
});
