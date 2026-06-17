# API Reference

## Compilation

### `compileGame(raw: unknown): CompiledGame`

Compiles raw JSON DSL to `CompiledGame`. Throws `JsonDeckCompileError` on validation failure.

```typescript
const game = compileGame(gameJson);
```

### `safeCompileGame(raw: unknown): CompileGameResult`

Safe version that returns a result object instead of throwing.

```typescript
const result = safeCompileGame(gameJson);
if (result.ok) {
  const game = result.game;
  console.log(result.warnings);
} else {
  console.error(result.errors);
  console.log(result.warnings);
}
```

## State Management

### `createInitialState(game: CompiledGame): GameState`

Creates the initial game state from a compiled game.

```typescript
const state = createInitialState(game);
// state.tick === 0
// state.nowMs === 0
// state.vars populated from game.variables
// state.cards contains initial cards
// state.zones contains all zones with initial cardIds
```

## Runtime

### `dispatchEvent(game: CompiledGame, state: GameState, event: GameEvent): DispatchResult`

Processes an event, finds matching rules, evaluates conditions, and executes commands.

```typescript
const result = dispatchEvent(game, state, {
  type: 'card.dropped_on_card',
  source: 'card_a',
  target: 'card_b',
  position: { x: 100, y: 200 },
});

console.log(result.state); // Updated state
console.log(result.accepted); // true if >= 1 rule executed successfully (incl. follow-ups)
console.log(result.matchedRules); // rules whose `on` matched the event type
console.log(result.executedRules); // rules that committed (condition passed + all commands ok)
console.log(result.errors); // Any errors
console.log(result.warnings); // Any warnings
```

> `matchedRules` lists every rule whose `on` matches the event type;
> `executedRules` lists only those that actually committed. `accepted` is
> `true` when at least one rule (including any `emit_event` follow-up) executed
> successfully — a rule that matches but whose `if` condition is false, or whose
> commands error and roll back, does **not** make `accepted` true.

### `tick(game: CompiledGame, state: GameState, deltaMs: number): TickResult`

Advances time and processes timers.

```typescript
const result = tick(game, state, 1000); // Advance 1 second

console.log(result.state); // Updated state
console.log(result.processedTimers); // Completed timer IDs
console.log(result.dispatchResults); // Results from timer.finished events
```

### `buildViewModel(game: CompiledGame, state: GameState): GameViewModel`

Builds a render-neutral view model from game and state.

```typescript
const vm = buildViewModel(game, state);

console.log(vm.table); // Table dimensions and style
console.log(vm.zones); // Zones with layout info
console.log(vm.cards); // Cards with calculated positions
console.log(vm.hud); // HUD items with resolved values
```

## Wrapper

### `createRuntime(raw: unknown): Runtime`

Convenience wrapper that manages game and state internally.

```typescript
const runtime = createRuntime(gameJson);

runtime.dispatch(event); // Returns DispatchResult
runtime.tick(deltaMs); // Returns TickResult
const state = runtime.getState();
const vm = runtime.getViewModel();
runtime.reset(); // Reset to initial state
```

## Types

### `CompiledGame`

```typescript
interface CompiledGame {
  id: string;
  title: string;
  description?: string;
  table: TableDefinition;
  variables: Record<string, VariableDefinition>;
  cardTypes: Record<string, CardTypeDefinition>;
  zones: Record<string, ZoneDefinition>;
  initialState: CompiledInitialState;
  rules: CompiledRule[];
  hud: HudItemDefinition[];
  theme: ThemeDefinition;
}
```

### `GameState`

```typescript
interface GameState {
  gameId: string;
  tick: number;
  nowMs: number;
  vars: Record<string, GameValue>;
  cards: Record<string, CardInstance>;
  zones: Record<string, ZoneState>;
  timers: Record<string, TimerInstance>;
  meta: GameMeta;
}
```

### `CardInstance`

```typescript
interface CardInstance {
  id: string;
  type: string;
  zone: string;
  x?: number;
  y?: number;
  z?: number;
  face: 'up' | 'down';
  props: Record<string, GameValue>;
  tags: string[];
  parent?: string;
  children?: string[];
}
```

### `GameEvent`

Union of built-in and custom events:

```typescript
type GameEvent =
  | GameStartedEvent
  | CardClickedEvent
  | CardDragStartedEvent
  | CardDroppedOnCardEvent
  | CardDroppedOnZoneEvent
  | CardDroppedOnEmptyEvent
  | TimerFinishedEvent
  | CustomGameEvent;
```

### `GameViewModel`

```typescript
interface GameViewModel {
  table: { width: number; height: number; background?: string };
  zones: ZoneViewModel[];
  cards: CardViewModel[];
  hud: HudItemViewModel[];
}

interface ZoneViewModel {
  id: string;
  title?: string;
  type: string;
  layout: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cardIds: string[];
  style: { border?: string; background?: string };
}

interface CardViewModel {
  id: string;
  type: string;
  title: string;
  description?: string;
  art?: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  face: 'up' | 'down';
  tags: string[];
  props: Record<string, GameValue>;
  style: {
    borderRadius?: number;
    background?: string;
    textColor?: string;
  };
}

interface HudItemViewModel {
  id: string;
  label: string;
  value: unknown;
}
```

### Error Types

```typescript
interface JsonDeckError {
  code: string; // Error code
  message: string; // Human readable message
  path?: string; // Path in DSL or state
  details?: unknown; // Additional context
}

interface JsonDeckWarning {
  code: string;
  message: string;
  path?: string;
}

class JsonDeckCompileError extends Error {
  readonly errors: JsonDeckError[];
  readonly warnings: JsonDeckWarning[];
}
```

## Error Codes

Common error codes:

- `DSL_VALIDATION_ERROR` — Structural validation failure
- `SEMANTIC_VALIDATION_ERROR` — Semantic validation failure
- `UNKNOWN_CARD` — Card not found in state
- `UNKNOWN_ZONE` — Zone not found in state
- `UNKNOWN_CARD_TYPE` — Card type not defined
- `UNKNOWN_VARIABLE` — Variable not defined
- `INVALID_VARIABLE_TYPE` — Variable type mismatch
- `INVALID_COMMAND` — Unknown command type
- `COMMAND_EXECUTION_ERROR` — Command execution failed
- `EXPRESSION_RESOLUTION_ERROR` — Expression path not found
- `INVALID_EVENT` — Event structure invalid
- `INVALID_TICK_DELTA` — Invalid deltaMs to tick()
- `MAX_EVENT_DEPTH_EXCEEDED` — Too many nested events

## Immutability

All functions return new objects. No mutations of input:

```typescript
const newResult = dispatchEvent(game, oldState, event);
// oldState is unchanged
// newResult.state is a new GameState

const tickResult = tick(game, oldState, 1000);
// oldState is unchanged
// tickResult.state is a new GameState
```

## Determinism

Same inputs always produce same outputs:

```typescript
const result1 = dispatchEvent(game, state1, event);
const result2 = dispatchEvent(game, state2, event);

if (state1.equals(state2) && event1.equals(event2)) {
  assert(result1.state.equals(result2.state));
}
```

No RNG, no Date.now(), no random delays.
