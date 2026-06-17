import { GameDefinition, Command } from './types.js';
import { JsonDeckError, JsonDeckWarning } from '../errors/types.js';

export function validateGameSemantically(game: GameDefinition): {
  errors: JsonDeckError[];
  warnings: JsonDeckWarning[];
} {
  const errors: JsonDeckError[] = [];
  const warnings: JsonDeckWarning[] = [];

  // Check unique card IDs
  const cardIds = new Set<string>();
  for (const card of game.initialState.cards) {
    if (cardIds.has(card.id)) {
      errors.push({
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Duplicate card ID: ${card.id}`,
        path: `initialState.cards[].id`,
      });
    }
    cardIds.add(card.id);

    // Check for reserved prefix
    if (card.id.startsWith('__jd_')) {
      errors.push({
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Card ID cannot start with reserved prefix "__jd_": ${card.id}`,
        path: `initialState.cards[].id`,
      });
    }
  }

  // Check card types and zones exist
  for (const card of game.initialState.cards) {
    if (!game.cardTypes[card.type]) {
      errors.push({
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Unknown card type: ${card.type}`,
        path: `initialState.cards[]`,
        details: { cardId: card.id },
      });
    }

    if (!game.zones[card.zone]) {
      errors.push({
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Unknown zone: ${card.zone}`,
        path: `initialState.cards[]`,
        details: { cardId: card.id },
      });
    }
  }

  // Check variable types match initial values
  if (game.variables) {
    for (const [varName, varDef] of Object.entries(game.variables)) {
      const initialType = typeof varDef.initial;
      const declaredType = varDef.type;

      if (
        (declaredType === 'number' && typeof varDef.initial !== 'number') ||
        (declaredType === 'string' && typeof varDef.initial !== 'string') ||
        (declaredType === 'boolean' && typeof varDef.initial !== 'boolean')
      ) {
        errors.push({
          code: 'SEMANTIC_VALIDATION_ERROR',
          message: `Variable "${varName}" type mismatch: declared ${declaredType} but initial value is ${initialType}`,
          path: `variables[${varName}]`,
        });
      }
    }
  }

  // Check unique rule IDs
  const ruleIds = new Set<string>();
  for (const rule of game.rules) {
    if (ruleIds.has(rule.id)) {
      errors.push({
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Duplicate rule ID: ${rule.id}`,
        path: `rules[].id`,
      });
    }
    ruleIds.add(rule.id);

    // Check rule event type
    const builtInEvents = [
      'game.started',
      'card.clicked',
      'card.drag_started',
      'card.dropped_on_card',
      'card.dropped_on_zone',
      'card.dropped_on_empty',
      'timer.finished',
    ];
    if (!builtInEvents.includes(rule.on) && !rule.on.startsWith('custom.')) {
      errors.push({
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Invalid rule event type: ${rule.on}. Must be a built-in event or start with "custom."`,
        path: `rules[]`,
        details: { ruleId: rule.id },
      });
    }
  }

  // Validate commands
  for (let ruleIdx = 0; ruleIdx < game.rules.length; ruleIdx++) {
    const rule = game.rules[ruleIdx];
    for (let cmdIdx = 0; cmdIdx < rule.then.length; cmdIdx++) {
      const cmd = rule.then[cmdIdx];

      // Each command object must contain exactly one key.
      const keyCount = Object.keys(cmd as Record<string, unknown>).length;
      if (keyCount !== 1) {
        errors.push({
          code: 'SEMANTIC_VALIDATION_ERROR',
          message: `Each command must contain exactly one key, found ${keyCount}`,
          path: `rules[${ruleIdx}].then[${cmdIdx}]`,
        });
        continue;
      }

      const cmdError = validateCommand(cmd, game);
      if (cmdError) {
        errors.push({
          ...cmdError,
          path: `rules[${ruleIdx}].then[${cmdIdx}]`,
        });
      }
    }
  }

  // Check HUD uniqueness and expressions
  const hudIds = new Set<string>();
  for (const hudItem of game.hud || []) {
    if (hudIds.has(hudItem.id)) {
      errors.push({
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Duplicate HUD item ID: ${hudItem.id}`,
        path: `hud[].id`,
      });
    }
    hudIds.add(hudItem.id);

    if (!hudItem.value.startsWith('$')) {
      errors.push({
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `HUD value must be an expression starting with "$": ${hudItem.value}`,
        path: `hud[]`,
        details: { hudId: hudItem.id },
      });
    }

    // Check $vars references
    if (hudItem.value.startsWith('$vars.')) {
      const varName = hudItem.value.slice(6).split('.')[0];
      if (!game.variables || !game.variables[varName]) {
        errors.push({
          code: 'SEMANTIC_VALIDATION_ERROR',
          message: `HUD references unknown variable: ${varName}`,
          path: `hud[]`,
          details: { hudId: hudItem.id },
        });
      }
    }
  }

  return { errors, warnings };
}

/** A value is a runtime expression if it is a string starting with `$`. */
function isExpression(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('$');
}

/**
 * A literal reference is a plain string (not a `$`-expression). Only literal
 * references can be validated against the static card-type / zone catalogs at
 * compile time; expressions are resolved and checked at runtime.
 */
function isLiteralRef(value: unknown): value is string {
  return typeof value === 'string' && !value.startsWith('$');
}

function validateCommand(cmd: Command, game: GameDefinition): JsonDeckError | null {
  // Literal references are validated at compile time; `$`-expressions are
  // resolved at runtime and must NOT be checked against the static catalogs.
  if ('move_card' in cmd) {
    const mc = cmd.move_card;
    if (isLiteralRef(mc.to_zone) && !game.zones[mc.to_zone]) {
      return {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Unknown zone in move_card: ${mc.to_zone}`,
      };
    }
  }

  if ('create_card' in cmd) {
    const cc = cmd.create_card;
    if (isLiteralRef(cc.type) && !game.cardTypes[cc.type]) {
      return {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Unknown card type in create_card: ${cc.type}`,
      };
    }
    if (isLiteralRef(cc.zone) && !game.zones[cc.zone]) {
      return {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Unknown zone in create_card: ${cc.zone}`,
      };
    }
    // count: a literal must be a positive integer; an expression ($...) is
    // deferred to runtime. A non-expression string literal (e.g. "3") is an error.
    if (isExpression(cc.count)) {
      // ok — resolved at runtime
    } else if (typeof cc.count === 'number') {
      if (!Number.isInteger(cc.count) || cc.count < 1) {
        return {
          code: 'SEMANTIC_VALIDATION_ERROR',
          message: `create_card.count must be a positive integer, got: ${cc.count}`,
        };
      }
    } else {
      return {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `create_card.count must be a positive integer or a $-expression, got: ${JSON.stringify(
          cc.count,
        )}`,
      };
    }
  }

  if ('set_var' in cmd) {
    const sv = cmd.set_var;
    if (!game.variables || !game.variables[sv.name]) {
      return {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Unknown variable in set_var: ${sv.name}`,
      };
    }
  }

  if ('modify_var' in cmd) {
    const mv = cmd.modify_var;
    if (!game.variables || !game.variables[mv.name]) {
      return {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `Unknown variable in modify_var: ${mv.name}`,
      };
    }
    if (game.variables[mv.name].type !== 'number') {
      return {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `modify_var can only be used with number variables: ${mv.name}`,
      };
    }
  }

  if ('start_timer' in cmd) {
    const st = cmd.start_timer;
    // duration_ms: a literal must be > 0; an expression ($...) is deferred to
    // runtime. A non-expression string literal (e.g. "100") is an error.
    if (isExpression(st.duration_ms)) {
      // ok — resolved at runtime
    } else if (typeof st.duration_ms === 'number') {
      if (!Number.isFinite(st.duration_ms) || st.duration_ms <= 0) {
        return {
          code: 'SEMANTIC_VALIDATION_ERROR',
          message: `start_timer.duration_ms must be a finite positive number, got: ${st.duration_ms}`,
        };
      }
    } else {
      return {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `start_timer.duration_ms must be a positive number or a $-expression, got: ${JSON.stringify(
          st.duration_ms,
        )}`,
      };
    }
  }

  if ('emit_event' in cmd) {
    const ee = cmd.emit_event;
    if (!ee.type.startsWith('custom.')) {
      return {
        code: 'SEMANTIC_VALIDATION_ERROR',
        message: `emit_event type must start with "custom.", got: ${ee.type}`,
      };
    }
  }

  return null;
}
