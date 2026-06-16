# DSL v0.1 Specification

Full specification of JsonDeck Markup Language v0.1.

This document describes the structure, syntax, and semantics of game definitions in DSL v0.1.

See the full ТЗ file for detailed examples and acceptance criteria.

## Quick Reference

```json
{
  "jsondeck": "0.1",
  "id": "game-id",
  "title": "Game Title",
  "description": "Optional description",
  "table": { "width": 800, "height": 600, "camera": { "mode": "fixed" } },
  "variables": {
    "var_name": { "type": "number", "initial": 0 }
  },
  "zones": {
    "zone_id": { "type": "free_space", "layout": "free" }
  },
  "cardTypes": {
    "card_type": { "title": "Card", "tags": ["tag"] }
  },
  "initialState": {
    "cards": [
      { "id": "c1", "type": "card_type", "zone": "zone_id" }
    ]
  },
  "rules": [
    {
      "id": "rule_id",
      "on": "game.started",
      "if": { "eq": [1, 1] },
      "then": [
        { "move_card": { "card": "c1", "to_zone": "zone_id" } }
      ]
    }
  ],
  "hud": [
    { "id": "hud_id", "label": "Label", "value": "$vars.var_name" }
  ],
  "theme": {
    "card": { "width": 120, "height": 170 }
  }
}
```

## Detailed Specification

### Root Fields

- `jsondeck: "0.1"` — Required version identifier
- `id: string` — Unique game identifier
- `title: string` — Human-readable game title
- `description?: string` — Optional description
- `table: TableDefinition` — Game board dimensions
- `variables?: Record<string, VariableDefinition>` — Game variables
- `zones: Record<string, ZoneDefinition>` — Card zones
- `cardTypes: Record<string, CardTypeDefinition>` — Card type definitions
- `initialState: InitialState` — Initial board state
- `rules: Rule[]` — Game rules
- `hud?: HudItemDefinition[]` — HUD elements
- `theme?: ThemeDefinition` — Visual theme

### TableDefinition

```typescript
{
  "width": number,        // Pixels
  "height": number,       // Pixels
  "background"?: string,  // Color or image URL
  "camera": { "mode": "fixed" }
}
```

### VariableDefinition

```typescript
{
  "type": "number" | "string" | "boolean",
  "initial": <matching type>
}
```

Variable types:
- `number` — Integer or floating-point
- `string` — Text
- `boolean` — true/false

### CardTypeDefinition

```typescript
{
  "title": string,
  "description"?: string,
  "art"?: string,
  "tags"?: string[],
  "props"?: Record<string, GameValue>
}
```

### ZoneDefinition

```typescript
{
  "title"?: string,
  "type": "free_space" | "deck" | "hand" | "discard" | "table" | "slot",
  "layout": "free" | "pile" | "row" | "grid",
  "rect"?: { "x": number, "y": number, "w": number, "h": number }
}
```

Types describe semantic meaning; layouts control card positioning.

### Expressions

String values starting with `$` are expressions:

```
"$source"           → value of 'source' variable in context
"$vars.counter"     → game variable 'counter'
"$position.x"       → x coordinate from event
"$timer.bind.data"  → nested property in timer bind
```

Literals (non-expressions) are strings not starting with `$`.

### Conditions

Conditions evaluate to boolean:

```typescript
// Logical
{ "all": [cond1, cond2, ...] }      // AND
{ "any": [cond1, cond2, ...] }      // OR
{ "not": cond }                     // NOT

// Comparison
{ "eq": [expr1, expr2] }
{ "gt": [expr1, expr2] }
{ "gte": [expr1, expr2] }
{ "lt": [expr1, expr2] }
{ "lte": [expr1, expr2] }

// Card
{ "card.is": [cardExpr, typeExpr] }
{ "card.has_tag": [cardExpr, tagExpr] }
{ "card.in_zone": [cardExpr, zoneExpr] }

// Zone
{ "zone.is_empty": zoneExpr }
```

### Commands

Commands modify state:

```typescript
// Move
{ "move_card": { "card": expr, "to_zone": expr, "x"?: expr, "y"?: expr } }

// Create
{ "create_card": { "type": expr, "zone": expr, "count": number, "near"?: expr } }

// Destroy
{ "destroy_card": { "card": expr } }

// Variables
{ "set_var": { "name": string, "value": expr } }
{ "modify_var": { "name": string, "add": expr } }

// Card state
{ "flip_card": { "card": expr, "face": "up" | "down" } }

// Timers
{ "start_timer": { "id": string, "duration_ms": number, "bind"?: Record<string, expr> } }

// Events
{ "emit_event": { "type": string, "payload"?: Record<string, expr> } }
```

### Rules

Rules respond to events:

```typescript
{
  "id": string,
  "on": RuleEventType,
  "if"?: Condition,
  "then": Command[]
}
```

Event types:
- Built-in: `game.started`, `card.clicked`, `card.drag_started`, `card.dropped_on_card`, `card.dropped_on_zone`, `card.dropped_on_empty`, `timer.finished`
- Custom: `custom.*`

### HudItemDefinition

```typescript
{
  "id": string,
  "label": string,
  "value": string  // Expression starting with $
}
```

### ThemeDefinition

```typescript
{
  "card"?: {
    "width"?: number,
    "height"?: number,
    "borderRadius"?: number,
    "background"?: string,
    "textColor"?: string
  },
  "zone"?: {
    "border"?: string,
    "background"?: string
  },
  "font"?: {
    "family"?: string,
    "size"?: number
  }
}
```

## Semantics

- Card IDs must be unique
- Card types and zones must be defined
- Variable types must match their initial values
- Rule IDs must be unique
- Custom events must start with "custom."
- create_card.count must be positive integer
- HUD values must start with "$"
- Circular event chains are limited to depth 32

## See Also

- [API.en.md](./API.en.md) — API reference
- [README.en.md](./README.en.md) — Overview
