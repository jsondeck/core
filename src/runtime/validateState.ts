import { CompiledGame } from '../dsl/types.js';
import { GameState } from '../model/types.js';
import { JsonDeckError } from '../errors/types.js';

export interface StateValidationResult {
  ok: boolean;
  errors: JsonDeckError[];
}

/**
 * Validates that a `GameState` is structurally consistent with a `CompiledGame`.
 * Useful before feeding a state that came from persistence, migration, or
 * untrusted code back into the runtime. Never throws; returns structured errors.
 *
 * Checks:
 * - every declared variable is present with a value of the declared type;
 * - every declared zone has a `ZoneState`;
 * - every card references a known zone and card type;
 * - the card⇄zone invariant holds (a card's `zone` lists it, and every id a
 *   zone lists exists and points back to that zone).
 */
export function validateState(game: CompiledGame, state: GameState): StateValidationResult {
  const errors: JsonDeckError[] = [];
  const add = (message: string, path: string) =>
    errors.push({ code: 'INVALID_STATE', message, path });

  if (state === null || typeof state !== 'object') {
    return { ok: false, errors: [{ code: 'INVALID_STATE', message: 'state must be an object' }] };
  }
  if (typeof state.vars !== 'object' || state.vars === null)
    add('state.vars must be an object', 'vars');
  if (typeof state.cards !== 'object' || state.cards === null)
    add('state.cards must be an object', 'cards');
  if (typeof state.zones !== 'object' || state.zones === null)
    add('state.zones must be an object', 'zones');
  if (typeof state.timers !== 'object' || state.timers === null)
    add('state.timers must be an object', 'timers');
  if (errors.length > 0) return { ok: false, errors };

  // Variables: present + correct declared type (and finite for numbers).
  for (const [name, def] of Object.entries(game.variables)) {
    if (!(name in state.vars)) {
      add(`missing variable "${name}"`, `vars.${name}`);
    } else if (typeof state.vars[name] !== def.type) {
      add(
        `variable "${name}" should be ${def.type}, got ${typeof state.vars[name]}`,
        `vars.${name}`,
      );
    } else if (def.type === 'number' && !Number.isFinite(state.vars[name])) {
      add(`variable "${name}" must be a finite number, got ${state.vars[name]}`, `vars.${name}`);
    }
  }

  // Zones: each declared zone exists and lists valid, back-pointing cards.
  for (const zoneId of Object.keys(game.zones)) {
    const zoneState = state.zones[zoneId];
    if (!zoneState) {
      add(`missing zone state "${zoneId}"`, `zones.${zoneId}`);
      continue;
    }
    if (!Array.isArray(zoneState.cardIds)) {
      add(`zone "${zoneId}".cardIds must be an array`, `zones.${zoneId}.cardIds`);
      continue;
    }
    for (const cardId of zoneState.cardIds) {
      const card = state.cards[cardId];
      if (!card) {
        add(`zone "${zoneId}" lists unknown card "${cardId}"`, `zones.${zoneId}.cardIds`);
      } else if (card.zone !== zoneId) {
        add(
          `card "${cardId}" is in zone "${zoneId}" list but its zone is "${card.zone}"`,
          `cards.${cardId}.zone`,
        );
      }
    }
  }

  // Cards: known type, known zone, and listed by that zone.
  for (const [cardId, card] of Object.entries(state.cards)) {
    if (!game.cardTypes[card.type]) {
      add(`card "${cardId}" has unknown type "${card.type}"`, `cards.${cardId}.type`);
    }
    const zoneState = state.zones[card.zone];
    if (!game.zones[card.zone]) {
      add(`card "${cardId}" references unknown zone "${card.zone}"`, `cards.${cardId}.zone`);
    } else if (zoneState && !zoneState.cardIds.includes(cardId)) {
      add(
        `card "${cardId}" is not listed in its zone "${card.zone}"`,
        `zones.${card.zone}.cardIds`,
      );
    }
  }

  // Timers: well-formed and finite, so a restored state cannot smuggle an
  // Infinity duration past `tick`.
  for (const [runtimeId, timer] of Object.entries(state.timers)) {
    if (typeof timer.id !== 'string' || timer.id.length === 0) {
      add(`timer "${runtimeId}" must have a string id`, `timers.${runtimeId}.id`);
    }
    if (!Number.isFinite(timer.durationMs)) {
      add(`timer "${runtimeId}".durationMs must be finite`, `timers.${runtimeId}.durationMs`);
    }
    if (!Number.isFinite(timer.remainingMs)) {
      add(`timer "${runtimeId}".remainingMs must be finite`, `timers.${runtimeId}.remainingMs`);
    }
    if (typeof timer.seq !== 'number' || !Number.isInteger(timer.seq)) {
      add(`timer "${runtimeId}".seq must be an integer`, `timers.${runtimeId}.seq`);
    }
    if (timer.bind === null || typeof timer.bind !== 'object') {
      add(`timer "${runtimeId}".bind must be an object`, `timers.${runtimeId}.bind`);
    }
  }

  return { ok: errors.length === 0, errors };
}
