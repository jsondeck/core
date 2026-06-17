# Compatibility policy

This document defines what stability guarantees `@jsondeck/core` makes, what
counts as a breaking change, and how the DSL evolves.

## Semantic versioning

The package follows [SemVer](https://semver.org/). See
[RELEASES.md](./RELEASES.en.md#versioning) for the per-segment rules and the
release criteria.

## What is covered (the public contract)

The stability guarantees apply to the **public API surface** only:

- The functions and classes exported from the package root (`compileGame`,
  `safeCompileGame`, `createInitialState`, `dispatchEvent`, `tick`,
  `buildViewModel`, `safeBuildViewModel`, `createRuntime`, `validateState`,
  `JsonDeckCompileError`, `JsonDeckErrorCodes`, `RUNTIME_LIMITS`).
- The exported TypeScript types (`CompiledGame`, `GameState`, `GameEvent`,
  `DispatchResult`, `TickResult`, `GameViewModel`, `JsonDeckError`,
  `JsonDeckWarning`, `JsonDeckErrorCode`, etc.).
- The JSON DSL grammar at its declared `jsondeck` version.
- The documented runtime semantics (rule ordering, transactions, timer `seq`
  ordering, deferred-timer behavior, `accepted` semantics).

## What is NOT covered (internal)

- Deep import paths (anything other than `@jsondeck/core`). Only the package
  root export is supported; `dist/` layout may change at any time.
- Exact wording of `message` strings (use `code`, not message text, for logic).
- The ordering of `warnings` and `errors` arrays beyond what is documented.
- Performance characteristics and internal data structures.

## What counts as a breaking change (major)

- Removing or renaming a public export, or changing a function signature in a
  source-incompatible way.
- Changing the shape of a public type in a way that breaks existing consumers
  (removing a field, narrowing a type).
- Changing documented runtime semantics (e.g. rule ordering, rollback behavior).
- A backward-incompatible change to the DSL grammar at the same `jsondeck`
  version.
- Adding a new error `code` returned **in place of** an existing one for an
  existing input.

## Non-breaking (minor / patch)

- Adding a new export, a new optional field, a new error `code` for a
  previously-unhandled input, or a new command/condition behind a new DSL
  version.
- Bug fixes that bring behavior in line with documented semantics.
- New warnings.

## DSL versioning

The DSL is versioned independently via the top-level `jsondeck` field
(currently `"0.1"`).

- A game declares the DSL version it targets. The compiler validates against
  that version.
- **`0.1` grammar is additive within `0.x`**: new optional fields/commands may
  appear in minor releases; existing valid `0.1` games keep compiling.
- A breaking DSL change ships as a new DSL version (e.g. `"0.2"`) plus a
  migration guide; the runtime may support multiple DSL versions during a
  transition window.

## `0.x` vs `1.0.0`

While on `0.x` the public API and DSL may receive backward-incompatible
refinements between **minor** versions (called out in the CHANGELOG). **Pin an
exact version.** `1.0.0` freezes DSL `0.1` and the public API; after it, breaking
changes require a major bump. The path to 1.0.0 is tracked in
[ROADMAP.md](./ROADMAP.md).

## GameState guarantees

- `GameState` returned from public functions is an owned snapshot; mutate it
  only through `dispatch` / `tick` / `reset`.
- The invariant `state.cards[id].zone` ⇔ `state.zones[zoneId].cardIds` is
  always upheld by the runtime. If you construct or migrate a state yourself,
  validate it with `validateState` before use.
