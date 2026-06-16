import { Condition } from '../dsl/types.js';
import { GameState } from '../model/types.js';
import { JsonDeckWarning } from '../errors/types.js';
import { resolveValue, ResolveContext } from '../expressions/resolveValue.js';

export interface ConditionResult {
  value: boolean;
  warnings: JsonDeckWarning[];
}

export function evaluateCondition(
  condition: Condition,
  state: GameState,
  context: ResolveContext,
): ConditionResult {
  const warnings: JsonDeckWarning[] = [];

  if ('all' in condition) {
    for (const subcond of condition.all) {
      const result = evaluateCondition(subcond, state, context);
      warnings.push(...result.warnings);
      if (!result.value) return { value: false, warnings };
    }
    return { value: true, warnings };
  }

  if ('any' in condition) {
    for (const subcond of condition.any) {
      const result = evaluateCondition(subcond, state, context);
      warnings.push(...result.warnings);
      if (result.value) return { value: true, warnings };
    }
    return { value: false, warnings };
  }

  if ('not' in condition) {
    const result = evaluateCondition(condition.not, state, context);
    warnings.push(...result.warnings);
    return { value: !result.value, warnings };
  }

  // Comparison operators
  if ('eq' in condition) {
    const [a, b] = condition.eq;
    const aRes = resolveValue(a, context);
    const bRes = resolveValue(b, context);
    warnings.push(...aRes.warnings, ...bRes.warnings);
    return { value: aRes.value === bRes.value, warnings };
  }

  if ('gt' in condition) {
    const [a, b] = condition.gt;
    const aRes = resolveValue(a, context);
    const bRes = resolveValue(b, context);
    warnings.push(...aRes.warnings, ...bRes.warnings);
    return { value: (aRes.value as any) > (bRes.value as any), warnings };
  }

  if ('gte' in condition) {
    const [a, b] = condition.gte;
    const aRes = resolveValue(a, context);
    const bRes = resolveValue(b, context);
    warnings.push(...aRes.warnings, ...bRes.warnings);
    return { value: (aRes.value as any) >= (bRes.value as any), warnings };
  }

  if ('lt' in condition) {
    const [a, b] = condition.lt;
    const aRes = resolveValue(a, context);
    const bRes = resolveValue(b, context);
    warnings.push(...aRes.warnings, ...bRes.warnings);
    return { value: (aRes.value as any) < (bRes.value as any), warnings };
  }

  if ('lte' in condition) {
    const [a, b] = condition.lte;
    const aRes = resolveValue(a, context);
    const bRes = resolveValue(b, context);
    warnings.push(...aRes.warnings, ...bRes.warnings);
    return { value: (aRes.value as any) <= (bRes.value as any), warnings };
  }

  // Card conditions
  if ('card.is' in condition) {
    const [cardExpr, typeExpr] = condition['card.is'];
    const cardRes = resolveValue(cardExpr, context);
    const typeRes = resolveValue(typeExpr, context);
    warnings.push(...cardRes.warnings, ...typeRes.warnings);

    const cardId = cardRes.value as string;
    const typeName = typeRes.value as string;

    const card = state.cards[cardId];
    if (!card) {
      warnings.push({
        code: 'UNKNOWN_CARD',
        message: `Card not found: ${cardId}`,
      });
      return { value: false, warnings };
    }

    return { value: card.type === typeName, warnings };
  }

  if ('card.has_tag' in condition) {
    const [cardExpr, tagExpr] = condition['card.has_tag'];
    const cardRes = resolveValue(cardExpr, context);
    const tagRes = resolveValue(tagExpr, context);
    warnings.push(...cardRes.warnings, ...tagRes.warnings);

    const cardId = cardRes.value as string;
    const tagName = tagRes.value as string;

    const card = state.cards[cardId];
    if (!card) {
      warnings.push({
        code: 'UNKNOWN_CARD',
        message: `Card not found: ${cardId}`,
      });
      return { value: false, warnings };
    }

    return { value: card.tags.includes(tagName), warnings };
  }

  if ('card.in_zone' in condition) {
    const [cardExpr, zoneExpr] = condition['card.in_zone'];
    const cardRes = resolveValue(cardExpr, context);
    const zoneRes = resolveValue(zoneExpr, context);
    warnings.push(...cardRes.warnings, ...zoneRes.warnings);

    const cardId = cardRes.value as string;
    const zoneId = zoneRes.value as string;

    const card = state.cards[cardId];
    if (!card) {
      warnings.push({
        code: 'UNKNOWN_CARD',
        message: `Card not found: ${cardId}`,
      });
      return { value: false, warnings };
    }

    const zone = state.zones[zoneId];
    if (!zone) {
      warnings.push({
        code: 'UNKNOWN_ZONE',
        message: `Zone not found: ${zoneId}`,
      });
      return { value: false, warnings };
    }

    return { value: card.zone === zoneId, warnings };
  }

  // Zone conditions
  if ('zone.is_empty' in condition) {
    const zoneRes = resolveValue(condition['zone.is_empty'], context);
    warnings.push(...zoneRes.warnings);

    const zoneId = zoneRes.value as string;
    const zone = state.zones[zoneId];
    if (!zone) {
      warnings.push({
        code: 'UNKNOWN_ZONE',
        message: `Zone not found: ${zoneId}`,
      });
      return { value: false, warnings };
    }

    return { value: zone.cardIds.length === 0, warnings };
  }

  warnings.push({
    code: 'EXPRESSION_RESOLUTION_ERROR',
    message: 'Unknown condition type',
  });
  return { value: false, warnings };
}
