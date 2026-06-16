import { describe, it, expect } from 'vitest';
import { compileGame, createInitialState, buildViewModel } from '../src/index.js';
import fixtureData from './fixtures/generic-card-interaction.json';

describe('buildViewModel', () => {
  const game = compileGame(fixtureData);

  it('should build ViewModel from state', () => {
    const state = createInitialState(game);
    const vm = buildViewModel(game, state);

    expect(vm.table.width).toBe(1280);
    expect(vm.table.height).toBe(720);
    expect(vm.table.background).toBe('#2f6b3f');
  });

  it('should include all zones', () => {
    const state = createInitialState(game);
    const vm = buildViewModel(game, state);

    expect(vm.zones.length).toBeGreaterThan(0);
    const mainZone = vm.zones.find((z) => z.id === 'main_zone');
    expect(mainZone).toBeDefined();
    if (mainZone) {
      expect(mainZone.title).toBe('Основная зона');
      expect(mainZone.layout).toBe('free');
    }
  });

  it('should include all cards with correct properties', () => {
    const state = createInitialState(game);
    const vm = buildViewModel(game, state);

    expect(vm.cards.length).toBe(2);
    const cardA = vm.cards.find((c) => c.id === 'card_a_1');
    expect(cardA).toBeDefined();
    if (cardA) {
      expect(cardA.title).toBe('Карта-актор');
      expect(cardA.type).toBe('card_type_actor');
      expect(cardA.tags).toContain('actor');
      expect(cardA.face).toBe('up');
    }
  });

  it('should apply theme styles', () => {
    const state = createInitialState(game);
    const vm = buildViewModel(game, state);

    const card = vm.cards[0];
    expect(card.width).toBe(120);
    expect(card.height).toBe(170);
    expect(card.style.borderRadius).toBe(12);
    expect(card.style.background).toBe('#f4ead7');
    expect(card.style.textColor).toBe('#1b1b1b');
  });

  it('should include HUD items with resolved values', () => {
    const state = createInitialState(game);
    const vm = buildViewModel(game, state);

    expect(vm.hud.length).toBe(2);
    const counterHud = vm.hud.find((h) => h.id === 'counter');
    expect(counterHud).toBeDefined();
    if (counterHud) {
      expect(counterHud.label).toBe('Счётчик');
      expect(counterHud.value).toBe(0);
    }
  });

  it('should handle layout modes correctly', () => {
    const layoutGame = compileGame({
      jsondeck: '0.1',
      id: 'layout-test',
      title: 'Layout',
      table: { width: 800, height: 600, camera: { mode: 'fixed' } },
      zones: {
        free_zone: {
          type: 'free_space',
          layout: 'free',
          rect: { x: 0, y: 0, w: 400, h: 300 },
        },
        row_zone: {
          type: 'table',
          layout: 'row',
          rect: { x: 400, y: 0, w: 400, h: 300 },
        },
      },
      cardTypes: { ct: { title: 'Card' } },
      initialState: {
        cards: [
          { id: 'c1', type: 'ct', zone: 'free_zone', x: 50, y: 50 },
          { id: 'c2', type: 'ct', zone: 'row_zone' },
          { id: 'c3', type: 'ct', zone: 'row_zone' },
        ],
      },
      rules: [],
    });

    const state = createInitialState(layoutGame);
    const vm = buildViewModel(layoutGame, state);

    // Free layout should use card's own coordinates
    const c1 = vm.cards.find((c) => c.id === 'c1');
    expect(c1?.x).toBe(50);
    expect(c1?.y).toBe(50);

    // Row layout should position cards horizontally
    const c2 = vm.cards.find((c) => c.id === 'c2');
    const c3 = vm.cards.find((c) => c.id === 'c3');
    if (c2 && c3) {
      expect(c2.x).toBeLessThan(c3.x);
      expect(c2.y).toBe(c3.y); // Same y in row layout
    }
  });

  it('should include card props in ViewModel', () => {
    const state = createInitialState(game);
    const vm = buildViewModel(game, state);

    const cardA = vm.cards.find((c) => c.id === 'card_a_1');
    expect(cardA?.props.power).toBe(1);
  });
});
