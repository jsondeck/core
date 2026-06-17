import { z } from 'zod';

// Reject NaN/Infinity for every numeric value that ends up in GameState, so the
// state stays finite and serializable.
const finiteNumber = z.number().finite();

const gameValueSchema = z.union([z.string(), finiteNumber, z.boolean()]);

const tableDefinitionSchema = z.object({
  width: finiteNumber.positive(),
  height: finiteNumber.positive(),
  background: z.string().optional(),
  camera: z.object({ mode: z.literal('fixed') }),
});

const variableDefinitionSchema = z.object({
  type: z.enum(['number', 'string', 'boolean']),
  initial: z.union([z.string(), finiteNumber, z.boolean()]),
});

const cardTypeDefinitionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  art: z.string().optional(),
  tags: z.array(z.string()).optional(),
  props: z.record(gameValueSchema).optional(),
});

const zoneDefinitionSchema = z.object({
  title: z.string().optional(),
  type: z.enum(['free_space', 'deck', 'hand', 'discard', 'table', 'slot']),
  layout: z.enum(['free', 'pile', 'row', 'grid']),
  rect: z.object({ x: finiteNumber, y: finiteNumber, w: finiteNumber, h: finiteNumber }).optional(),
});

const initialCardSchema = z.object({
  id: z.string(),
  type: z.string(),
  zone: z.string(),
  x: finiteNumber.optional(),
  y: finiteNumber.optional(),
  z: finiteNumber.optional(),
  face: z.enum(['up', 'down']).optional().default('up'),
});

const initialStateSchema = z.object({
  cards: z.array(initialCardSchema),
});

const hudItemDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

const themeDefinitionSchema = z.object({
  card: z
    .object({
      width: finiteNumber.optional(),
      height: finiteNumber.optional(),
      borderRadius: finiteNumber.optional(),
      background: z.string().optional(),
      textColor: z.string().optional(),
    })
    .optional(),
  zone: z
    .object({
      border: z.string().optional(),
      background: z.string().optional(),
    })
    .optional(),
  font: z
    .object({
      family: z.string().optional(),
      size: finiteNumber.optional(),
    })
    .optional(),
});

// Condition schema - recursive
export const conditionSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.object({ all: z.array(conditionSchema) }),
    z.object({ any: z.array(conditionSchema) }),
    z.object({ not: conditionSchema }),
    z.object({ eq: z.array(z.any()) }),
    z.object({ gt: z.array(z.any()) }),
    z.object({ gte: z.array(z.any()) }),
    z.object({ lt: z.array(z.any()) }),
    z.object({ lte: z.array(z.any()) }),
    z.object({ 'card.is': z.array(z.any()) }),
    z.object({ 'card.has_tag': z.array(z.any()) }),
    z.object({ 'card.in_zone': z.array(z.any()) }),
    z.object({ 'zone.is_empty': z.any() }),
  ]),
);

// Command schema.
// The command *parameter* objects are `.strict()` (unknown params are an error),
// but the outer one-key wrapper is `.passthrough()`. Passthrough keeps any extra
// top-level keys in the parsed output so semantic validation can detect a command
// object with more than one key and report it as a SEMANTIC_VALIDATION_ERROR
// (spec §8.2 classifies "exactly one key" as a semantic rule). A bogus wrapper
// with no known command key still fails the union (DSL_VALIDATION_ERROR).
const expressionOrNumber = z.union([finiteNumber, z.string()]);

export const commandSchema: z.ZodType<unknown> = z.union([
  z
    .object({
      move_card: z
        .object({
          card: z.unknown(),
          to_zone: z.unknown(),
          x: z.unknown().optional(),
          y: z.unknown().optional(),
        })
        .strict(),
    })
    .passthrough(),
  z
    .object({
      create_card: z
        .object({
          type: z.unknown(),
          zone: z.unknown(),
          // Literal number or `$`-expression; semantic validation enforces
          // positive-integer for the literal case.
          count: expressionOrNumber,
          near: z.unknown().optional(),
        })
        .strict(),
    })
    .passthrough(),
  z.object({ destroy_card: z.object({ card: z.unknown() }).strict() }).passthrough(),
  z.object({ set_var: z.object({ name: z.string(), value: z.unknown() }).strict() }).passthrough(),
  z.object({ modify_var: z.object({ name: z.string(), add: z.unknown() }).strict() }).passthrough(),
  z
    .object({ flip_card: z.object({ card: z.unknown(), face: z.enum(['up', 'down']) }).strict() })
    .passthrough(),
  z
    .object({
      start_timer: z
        .object({
          id: z.string(),
          // Literal number or `$`-expression; semantic validation enforces > 0
          // for the literal case.
          duration_ms: expressionOrNumber,
          bind: z.record(z.unknown()).optional(),
        })
        .strict(),
    })
    .passthrough(),
  z
    .object({
      emit_event: z
        .object({
          type: z.string(),
          payload: z.record(z.unknown()).optional(),
        })
        .strict(),
    })
    .passthrough(),
]);

const ruleSchema = z.object({
  id: z.string(),
  on: z.string(),
  if: conditionSchema.optional(),
  then: z.array(commandSchema),
});

export const gameDefinitionSchema = z.object({
  jsondeck: z.literal('0.1'),
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  table: tableDefinitionSchema,
  variables: z.record(variableDefinitionSchema).optional(),
  zones: z.record(zoneDefinitionSchema),
  cardTypes: z.record(cardTypeDefinitionSchema),
  initialState: initialStateSchema,
  rules: z.array(ruleSchema),
  hud: z.array(hudItemDefinitionSchema).optional(),
  theme: themeDefinitionSchema.optional(),
});
