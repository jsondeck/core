import { describe, it, expect } from 'vitest';
import { compileGame, safeCompileGame, createInitialState, dispatchEvent } from '../src/index.js';

function makeGame(rules: unknown[], extra: Record<string, unknown> = {}) {
  return {
    jsondeck: '0.1',
    id: 'cmd-test',
    title: 'Command Test',
    table: { width: 800, height: 600, camera: { mode: 'fixed' } },
    zones: { z1: { type: 'free_space', layout: 'free' } },
    cardTypes: {
      ct: { title: 'Card', tags: ['t'], props: { v: 1 } },
      ct2: { title: 'Card 2' },
    },
    initialState: {
      cards: [
        { id: 'c1', type: 'ct', zone: 'z1', x: 10, y: 20 },
        { id: 'c2', type: 'ct2', zone: 'z1' },
      ],
    },
    rules,
    variables: {
      n: { type: 'number', initial: 0 },
      s: { type: 'string', initial: 'a' },
      b: { type: 'boolean', initial: false },
    },
    ...extra,
  };
}

const fire = (gameJson: unknown) => {
  const game = compileGame(gameJson);
  const state = createInitialState(game);
  return dispatchEvent(game, state, { type: 'game.started' });
};

describe('commands', () => {
  describe('set_var', () => {
    it('sets a value of the correct type', () => {
      const res = fire(
        makeGame([{ id: 'r', on: 'game.started', then: [{ set_var: { name: 'n', value: 5 } }] }]),
      );
      expect(res.accepted).toBe(true);
      expect(res.state.vars.n).toBe(5);
    });

    it('rejects a type mismatch and rolls back', () => {
      const res = fire(
        makeGame([
          { id: 'r', on: 'game.started', then: [{ set_var: { name: 'n', value: 'nope' } }] },
        ]),
      );
      expect(res.accepted).toBe(false);
      expect(res.errors.some((e) => e.code === 'INVALID_VARIABLE_TYPE')).toBe(true);
      expect(res.state.vars.n).toBe(0); // unchanged
      expect(typeof res.state.vars.n).toBe('number');
    });
  });

  describe('modify_var', () => {
    it('adds a numeric value', () => {
      const res = fire(
        makeGame([{ id: 'r', on: 'game.started', then: [{ modify_var: { name: 'n', add: 3 } }] }]),
      );
      expect(res.state.vars.n).toBe(3);
    });

    it('rejects a non-number add value and rolls back', () => {
      const res = fire(
        makeGame([
          { id: 'r', on: 'game.started', then: [{ modify_var: { name: 'n', add: 'x' } }] },
        ]),
      );
      expect(res.accepted).toBe(false);
      expect(res.errors.some((e) => e.code === 'INVALID_VARIABLE_TYPE')).toBe(true);
      expect(res.state.vars.n).toBe(0);
      expect(typeof res.state.vars.n).toBe('number');
    });
  });

  describe('create_card', () => {
    it('creates cards with __jd_card_ ids and copies type props/tags', () => {
      const res = fire(
        makeGame([
          {
            id: 'r',
            on: 'game.started',
            then: [{ create_card: { type: 'ct', zone: 'z1', count: 2 } }],
          },
        ]),
      );
      const created = Object.values(res.state.cards).filter((c) => c.id.startsWith('__jd_card_'));
      expect(created.length).toBe(2);
      expect(created[0].tags).toContain('t');
      expect(created[0].props.v).toBe(1);
      expect(res.state.zones.z1.cardIds).toEqual(
        expect.arrayContaining([created[0].id, created[1].id]),
      );
    });

    it('offsets new cards by 30*i near a reference card', () => {
      const res = fire(
        makeGame([
          {
            id: 'r',
            on: 'game.started',
            then: [{ create_card: { type: 'ct', zone: 'z1', count: 2, near: 'c1' } }],
          },
        ]),
      );
      const created = Object.values(res.state.cards)
        .filter((c) => c.id.startsWith('__jd_card_'))
        .sort((a, b) => a.id.localeCompare(b.id));
      expect(created[0].x).toBe(10);
      expect(created[0].y).toBe(20);
      expect(created[1].x).toBe(40);
      expect(created[1].y).toBe(50);
    });
  });

  describe('flip_card / move_card / destroy_card', () => {
    it('flips a card face', () => {
      const res = fire(
        makeGame([
          { id: 'r', on: 'game.started', then: [{ flip_card: { card: 'c1', face: 'down' } }] },
        ]),
      );
      expect(res.state.cards.c1.face).toBe('down');
    });

    it('move_card keeps zones consistent', () => {
      const game = makeGame(
        [{ id: 'r', on: 'game.started', then: [{ move_card: { card: 'c1', to_zone: 'z2' } }] }],
        {
          zones: {
            z1: { type: 'free_space', layout: 'free' },
            z2: { type: 'table', layout: 'row' },
          },
        },
      );
      const res = fire(game);
      expect(res.state.cards.c1.zone).toBe('z2');
      expect(res.state.zones.z1.cardIds).not.toContain('c1');
      expect(res.state.zones.z2.cardIds).toContain('c1');
    });

    it('destroy_card removes card from cards and its zone', () => {
      const res = fire(
        makeGame([{ id: 'r', on: 'game.started', then: [{ destroy_card: { card: 'c1' } }] }]),
      );
      expect(res.state.cards.c1).toBeUndefined();
      expect(res.state.zones.z1.cardIds).not.toContain('c1');
    });

    it('rolls back the whole transaction if a later command fails', () => {
      const res = fire(
        makeGame([
          {
            id: 'r',
            on: 'game.started',
            then: [
              { set_var: { name: 'n', value: 9 } },
              { destroy_card: { card: 'does_not_exist' } },
            ],
          },
        ]),
      );
      expect(res.accepted).toBe(false);
      expect(res.state.vars.n).toBe(0); // first command rolled back too
    });
  });

  describe('emit_event deep-resolve', () => {
    it('deep-resolves nested $-expressions inside payload', () => {
      const game = compileGame(
        makeGame([
          {
            id: 'emitter',
            on: 'card.clicked',
            then: [
              {
                emit_event: {
                  type: 'custom.echo',
                  payload: { nested: { who: '$source', list: ['$source', 'literal'] } },
                },
              },
            ],
          },
          {
            id: 'receiver',
            on: 'custom.echo',
            // store a flag so we can assert the rule ran
            then: [{ set_var: { name: 'n', value: 1 } }],
          },
        ]),
      );
      const state = createInitialState(game);
      const res = dispatchEvent(game, state, { type: 'card.clicked', source: 'c1' } as never);

      const echo = res.emittedEvents.find((e) => e.type === 'custom.echo') as {
        payload?: { nested?: { who?: string; list?: string[] } };
      };
      expect(echo?.payload?.nested?.who).toBe('c1');
      expect(echo?.payload?.nested?.list).toEqual(['c1', 'literal']);
      expect(res.executedRules).toContain('receiver');
    });
  });

  describe('semantic rejection at compile time', () => {
    it('rejects a command object with two keys', () => {
      const r = safeCompileGame(
        makeGame([
          {
            id: 'r',
            on: 'game.started',
            then: [{ set_var: { name: 'n', value: 1 }, modify_var: { name: 'n', add: 1 } }],
          },
        ]),
      );
      expect(r.ok).toBe(false);
    });

    it('rejects a string literal create_card.count', () => {
      const r = safeCompileGame(
        makeGame([
          {
            id: 'r',
            on: 'game.started',
            then: [{ create_card: { type: 'ct', zone: 'z1', count: '3' } }],
          },
        ]),
      );
      expect(r.ok).toBe(false);
    });

    it('rejects a string literal start_timer.duration_ms', () => {
      const r = safeCompileGame(
        makeGame([
          { id: 'r', on: 'game.started', then: [{ start_timer: { id: 't', duration_ms: '100' } }] },
        ]),
      );
      expect(r.ok).toBe(false);
    });
  });
});
