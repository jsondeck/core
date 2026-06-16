# @jsondeck/core

[![CI Status](https://github.com/jsondeck/core/actions/workflows/ci.yml/badge.svg)](https://github.com/jsondeck/core/actions)
[![npm version](https://img.shields.io/npm/v/@jsondeck/core.svg)](https://www.npmjs.com/package/@jsondeck/core)
[![npm downloads](https://img.shields.io/npm/dm/@jsondeck/core.svg)](https://www.npmjs.com/package/@jsondeck/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Headless TypeScript runtime for JSON-defined card games.**

`@jsondeck/core` is a pure, deterministic game engine for building and executing card games defined in JSON DSL. It provides validation, compilation, state management, event dispatching, rule execution, and render-neutral view models.

This is a **headless library** — it contains no UI, DOM, Canvas, or browser dependencies. Perfect for:

- Server-side game validation
- Node.js game servers
- Web browsers (via bundlers)
- Web Workers
- Testing and automation

## Installation

```bash
npm install @jsondeck/core
```

Or with yarn/pnpm:

```bash
yarn add @jsondeck/core
pnpm add @jsondeck/core
```

## Requirements

- **Node.js ≥ 18** (or any modern browser / Web Worker via a bundler).
- **ESM-only.** This package ships as an ES module (`"type": "module"`) with
  TypeScript declarations. Import it with `import` from ESM code or a bundler.
  CommonJS consumers can load it via dynamic `await import('@jsondeck/core')`.
- The only runtime dependency is [`zod`](https://github.com/colinhacks/zod).

## Quick Start

```typescript
import {
  compileGame,
  createInitialState,
  dispatchEvent,
  tick,
  buildViewModel,
} from '@jsondeck/core';

// Load your game definition
const gameJson = {
  jsondeck: '0.1',
  id: 'my-game',
  title: 'My Game',
  table: { width: 800, height: 600, camera: { mode: 'fixed' } },
  zones: { main: { type: 'free_space', layout: 'free' } },
  cardTypes: { card: { title: 'Card' } },
  initialState: { cards: [{ id: 'c1', type: 'card', zone: 'main' }] },
  rules: [],
};

// Compile and initialize
const game = compileGame(gameJson);
let state = createInitialState(game);

// Dispatch an event
const result = dispatchEvent(game, state, {
  type: 'card.clicked',
  source: 'c1',
  position: { x: 100, y: 100 },
});

state = result.state;

// Advance time and process timers
const tickResult = tick(game, state, 1000);
state = tickResult.state;

// Build a view model for rendering
const viewModel = buildViewModel(game, state);
console.log(viewModel);
```

## Key Features

- **JSON DSL v0.1** — Define games in declarative JSON
- **Validation** — Structural and semantic validation with detailed error reporting
- **Rule Engine** — Event-driven rules with conditions and commands
- **State Management** — Immutable state transitions via transactions
- **Expressions** — Variable and context-aware expression resolution
- **Timers** — Built-in timer management with tick-based processing
- **View Models** — Render-neutral ViewModel for any UI framework
- **Deterministic** — Same inputs always produce same outputs
- **Type-Safe** — Full TypeScript support with strict types

## Documentation

- **[English](docs/README.en.md)** — Full API reference and concepts
- **[Русский](docs/README.ru.md)** — Полное описание на русском

### Core Concepts

- **DSL** — [English](docs/DSL.en.md) | [Русский](docs/DSL.ru.md)
- **API** — [English](docs/API.en.md) | [Русский](docs/API.ru.md)
- **Releases** — [English](docs/RELEASES.en.md) | [Русский](docs/RELEASES.ru.md)

## Example Games

See [examples/](examples/) for sample game definitions:

- [generic-card-interaction.json](examples/generic-card-interaction.json) — Basic card interaction demo

## API Overview

### Compilation

```typescript
// Throws on error
const game = compileGame(raw);

// Returns result object
const result = safeCompileGame(raw);
if (result.ok) {
  const game = result.game;
}
```

### Runtime

```typescript
// Create initial state
const state = createInitialState(game);

// Dispatch events
const dispatchResult = dispatchEvent(game, state, event);
const newState = dispatchResult.state;

// Process time
const tickResult = tick(game, state, deltaMs);
const newState = tickResult.state;

// Build view model
const viewModel = buildViewModel(game, state);
```

### Wrapper

```typescript
// Convenience runtime wrapper
const runtime = createRuntime(gameJson);
runtime.dispatch(event);
runtime.tick(100);
const vm = runtime.getViewModel();
```

### Error handling

Validation and runtime errors are structured (`{ code, message, path? }`).
Use the exported `JsonDeckErrorCodes` catalog instead of magic strings:

```typescript
import { safeCompileGame, JsonDeckErrorCodes } from '@jsondeck/core';

const result = safeCompileGame(raw);
if (!result.ok) {
  for (const err of result.errors) {
    if (err.code === JsonDeckErrorCodes.SEMANTIC_VALIDATION_ERROR) {
      console.warn(`Invalid DSL at ${err.path}: ${err.message}`);
    }
  }
}
```

`compileGame` throws a `JsonDeckCompileError` (with `.errors` / `.warnings`)
whose `message` summarizes the first failure for logs and stack traces.

## Architecture Principles

- **Clean Architecture** — No global state, no side effects, no I/O
- **Immutability** — All functions return new objects
- **Determinism** — Identical inputs produce identical outputs
- **Headless** — No rendering, UI, or browser dependencies
- **Testability** — Pure functions, easy to unit test

## Contributing

Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines on submitting PRs and working with the codebase.

## Status

Current version: **0.1.0** (Beta)

This is the initial release implementing DSL v0.1 and core runtime features. See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

MIT — see [LICENSE](LICENSE) for details.

---

**Monorepo note:** This package is part of the JsonDeck platform but stands alone as an independent npm module.
