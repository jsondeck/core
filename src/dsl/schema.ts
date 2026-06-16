import { z } from 'zod';

const gameValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const tableDefinitionSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  background: z.string().optional(),
  camera: z.object({ mode: z.literal('fixed') }),
});

const variableDefinitionSchema = z.object({
  type: z.enum(['number', 'string', 'boolean']),
  initial: z.union([z.string(), z.number(), z.boolean()]),
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
  rect: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).optional(),
});

const initialCardSchema = z.object({
  id: z.string(),
  type: z.string(),
  zone: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
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
      width: z.number().optional(),
      height: z.number().optional(),
      borderRadius: z.number().optional(),
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
      size: z.number().optional(),
    })
    .optional(),
});

// Condition schema - recursive
export const conditionSchema: z.ZodType<any> = z.lazy(() =>
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

// Command schema - recursive
export const commandSchema: z.ZodType<any> = z.union([
  z.object({
    move_card: z.object({
      card: z.any(),
      to_zone: z.any(),
      x: z.any().optional(),
      y: z.any().optional(),
    }),
  }),
  z.object({
    create_card: z.object({
      type: z.any(),
      zone: z.any(),
      count: z.any(),
      near: z.any().optional(),
    }),
  }),
  z.object({ destroy_card: z.object({ card: z.any() }) }),
  z.object({ set_var: z.object({ name: z.string(), value: z.any() }) }),
  z.object({ modify_var: z.object({ name: z.string(), add: z.any() }) }),
  z.object({ flip_card: z.object({ card: z.any(), face: z.enum(['up', 'down']) }) }),
  z.object({
    start_timer: z.object({
      id: z.string(),
      duration_ms: z.any(),
      bind: z.record(z.any()).optional(),
    }),
  }),
  z.object({
    emit_event: z.object({
      type: z.string(),
      payload: z.record(z.any()).optional(),
    }),
  }),
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
