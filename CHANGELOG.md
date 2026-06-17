# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-06-17

### Fixed

- Rules matched by the same event now observe variables committed by earlier
  rules in that event dispatch. `dispatchEvent` recreates the rule context from
  the current committed state before each rule, so `$vars.*` is fresh instead
  of stale.
- Card and zone event references are now validated against the current
  `GameState` before any rules run. Stale UI/server events that reference
  missing source/target cards or zones return `UNKNOWN_CARD`/`UNKNOWN_ZONE`
  without side effects.
- Semantic validation now rejects invalid condition arity for two-operand
  conditions (`eq`, numeric comparisons, and card predicates) and rejects array
  syntax for `zone.is_empty`.

### Changed

- CI now runs the primary gate on Node 22 and Node 24, keeps a legacy Node
  18/20 compatibility job while `engines.node` remains `>=18`, and enforces
  `npm audit --omit=dev`.
- The release workflow is prepared for npm Trusted Publishing via GitHub
  Actions OIDC on Node 24 with npm 11; the normal publish path no longer uses a
  long-lived `NPM_TOKEN`.

## [0.1.0] - 2024-06-16

### Added

- Initial release of `@jsondeck/core`
- JSON DSL v0.1 support
- Validation pipeline (structural and semantic)
- Compilation pipeline
- GameState management
- Event dispatching with rule engine
- Expression resolution
- Condition evaluation
- Command execution (move_card, create_card, destroy_card, set_var, modify_var, flip_card, start_timer, emit_event)
- Timer management with `tick()`
- Render-neutral ViewModel
- `validateState` + `safeBuildViewModel` for structured (non-throwing) handling
  of inconsistent / persisted / migrated state (new `INVALID_STATE` code)
- `RUNTIME_LIMITS` (event/expression depth) with a `deepResolve` depth guard; and
  finite-number enforcement across the board — non-finite DSL numbers (variable
  initials, coordinates, table/rect, `count`, `duration_ms`) are rejected at
  compile, and `set_var`/`modify_var`/`move_card`/`start_timer` reject
  `NaN`/`Infinity`/overflow at runtime
- Deep, recursive cloning of `timer.bind` (nested objects/arrays) so runtime
  state snapshots are fully isolated from internal state; `deepResolve` also
  clones the object/array a `$`-expression resolves to (e.g.
  `bind: { p: "$event.payload" }`) so the live event payload/vars are never
  aliased into state
- `validateState` additionally validates `state.timers` (finite
  `durationMs`/`remainingMs`, well-formed shape); `theme` numbers are
  finite-checked at compile
- Strict event validation (field types and nested shapes, not just presence);
  `dispatchEvent`/`tick` never throw on malformed input
- `Runtime` returns owned state snapshots (no mutable leak via
  `getState`/`reset`/`dispatch`/`tick`)
- Structured error and warning system, including the exported `JsonDeckErrorCodes`
  catalog and `JsonDeckErrorCode` union
- Integrator docs: error catalog, production checklist & limits, compatibility
  policy, roadmap to 1.0.0; consumer + browser-bundle CI smoke
- ESM + TypeScript declarations; package metadata hardened for publishing
  (`engines`, `publishConfig` with provenance, clean `dist` without source maps);
  ships `examples/` and `SECURITY.md`
