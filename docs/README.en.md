# JsonDeck Core — Documentation

`@jsondeck/core` is a headless TypeScript runtime for JSON-defined card games.

## Overview

This library provides:

- **DSL Parser & Validator** — Parse and validate game definitions in JSON DSL v0.1
- **Game State Management** — Create, mutate, and track game state immutably
- **Rule Engine** — Event-driven rules with conditions and commands
- **Expression Resolution** — Context-aware variable and property resolution
- **Command Execution** — Move cards, create cards, modify variables, manage timers
- **Event Dispatching** — Process game events and trigger rules
- **Timer Management** — Built-in timer system with tick-based processing
- **View Models** — Render-neutral output for any UI framework

## Architecture

```
Raw JSON DSL
    ↓
[Validation] → Errors/Warnings
    ↓
CompiledGame
    ↓
GameState (initial)
    ↓
[Event Dispatch] ← GameEvent
    ↓
GameState (mutated)
    ↓
[Tick Processing] ← deltaMs
    ↓
GameState + ViewModel
```

## Core Concepts

### 1. Compilation

Convert raw JSON to internal `CompiledGame`:

```typescript
const game = compileGame(rawJson);
// or
const result = safeCompileGame(rawJson);
if (result.ok) {
  /* ... */
}
```

### 2. Game State

Immutable snapshot of game at any point:

```typescript
interface GameState {
  gameId: string;
  tick: number; // How many ticks have passed
  nowMs: number; // Total elapsed time in ms
  vars: Record<string, any>; // Game variables
  cards: Record<string, CardInstance>;
  zones: Record<string, ZoneState>;
  timers: Record<string, TimerInstance>;
  meta: GameMeta;
}
```

### 3. Events

Trigger rules by dispatching events:

```typescript
const result = dispatchEvent(game, state, {
  type: 'card.clicked',
  source: 'card_id',
  position: { x: 100, y: 200 },
});

state = result.state; // Updated state
```

### 4. Rules

Rules respond to events with conditions and commands:

```json
{
  "id": "my_rule",
  "on": "card.dropped_on_card",
  "if": { "card.has_tag": ["$source", "interactive"] },
  "then": [{ "start_timer": { "id": "my_timer", "duration_ms": 5000 } }]
}
```

### 5. Timers

Track timed delays and triggers:

```typescript
const tickResult = tick(game, state, 1000); // Advance 1 second

// Timer completion triggers timer.finished events
// New timers created in this tick won't be processed until next tick
```

### 6. View Models

Get render-neutral representation:

```typescript
const vm = buildViewModel(game, state);
// Contains: zones, cards, HUD items with coordinates and styles
```

## Key Features

### Immutability

All functions return new state, never mutate input:

```typescript
const result = dispatchEvent(game, state, event);
const newState = result.state;
// Original state is unchanged
```

### Determinism

Same inputs → same outputs. No RNG, no timestamps, no side effects.

### Type Safety

Full TypeScript support with strict types. No `any`.

### Error Handling

Structured errors with codes and paths:

```typescript
interface JsonDeckError {
  code: string; // 'UNKNOWN_CARD', 'SEMANTIC_VALIDATION_ERROR', etc
  message: string;
  path?: string; // Where in DSL or state
}
```

## DSL v0.1

See [DSL.en.md](./DSL.en.md) for full specification.

Quick example:

```json
{
  "jsondeck": "0.1",
  "id": "game-id",
  "title": "Game Title",
  "table": { "width": 800, "height": 600, "camera": { "mode": "fixed" } },
  "zones": {
    "main": { "type": "free_space", "layout": "free" }
  },
  "cardTypes": {
    "my-card": { "title": "My Card", "tags": ["interactive"] }
  },
  "initialState": {
    "cards": [{ "id": "c1", "type": "my-card", "zone": "main" }]
  },
  "rules": [
    {
      "id": "handle-click",
      "on": "card.clicked",
      "then": [{ "flip_card": { "card": "$source", "face": "down" } }]
    }
  ]
}
```

## API Reference

See [API.en.md](./API.en.md) for complete API documentation.

Key exports:

```typescript
export { compileGame, safeCompileGame };
export { createInitialState };
export { dispatchEvent };
export { tick };
export { buildViewModel };
export { createRuntime };
```

## Common Patterns

### Create a Runtime Wrapper

```typescript
const runtime = createRuntime(gameJson);
runtime.dispatch(event);
runtime.tick(100);
const vm = runtime.getViewModel();
```

### Handle Errors Safely

```typescript
const result = safeCompileGame(gameJson);
if (!result.ok) {
  console.error('Compilation failed:', result.errors);
} else {
  const game = result.game;
}
```

### Resolve Expressions

Expressions starting with `$` are resolved:

```json
{ "card": "$source" }         // → value of 'source' in context
{ "counter": "$vars.counter" } // → game variable value
```

### Process Multiple Timers

```typescript
for (let i = 0; i < 10; i++) {
  const tickResult = tick(game, state, 1000);
  state = tickResult.state;
  console.log('Processed timers:', tickResult.processedTimers);
}
```

## Performance

- No optimization needed for small games (< 1000 cards, < 100 rules)
- State cloning is O(cards + timers), not O(everything)
- Rule matching is O(rules), conditions are evaluated lazily
- Avoid deep nesting in conditions for complex games

## Testing

Use `@jsondeck/core` in your game's test suite:

```typescript
import { compileGame, createInitialState, dispatchEvent } from '@jsondeck/core';

describe('my game', () => {
  it('should respond to events', () => {
    const game = compileGame(myGameJson);
    const state = createInitialState(game);
    const result = dispatchEvent(game, state, myEvent);
    expect(result.state.cards).toHaveProperty('new_card');
  });
});
```

## Limitations & Constraints

- No multiplayer or networking (headless only)
- No asset loading (images, sounds, fonts)
- No animations or visual effects
- No persistence or save/load
- No user accounts or authentication
- No hidden information or player perspectives
- No randomness (deterministic only)

These responsibilities belong to your UI/game framework, not core.

## Next Steps

1. Read [DSL.en.md](./DSL.en.md) to understand game syntax
2. Review [API.en.md](./API.en.md) for function signatures
3. Check [examples/](../examples/) for sample games
4. See [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute

## Support

- Issues: [github.com/jsondeck/core/issues](https://github.com/jsondeck/core/issues)
- Discussions: [github.com/jsondeck/core/discussions](https://github.com/jsondeck/core/discussions)
