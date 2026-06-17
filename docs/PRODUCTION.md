# Production checklist & operational guidance

Guidance for integrating `@jsondeck/core` into a commercial product, especially
when the JSON DSL or events come from untrusted sources (user-generated content,
the network, a multiplayer peer).

## Integration checklist

- [ ] **Pin an exact version** (`"@jsondeck/core": "0.1.0"`); upgrade
      deliberately and read the CHANGELOG (the API/DSL may change between `0.x`
      minors — see [COMPATIBILITY.md](./COMPATIBILITY.md)).
- [ ] **Compile with `safeCompileGame`** for untrusted DSL and handle
      `{ ok: false }` (never let `compileGame` throw on user input).
- [ ] **Validate restored state** with `validateState` (or use
      `safeBuildViewModel`) when loading from persistence/migration.
- [ ] **Treat `GameState` as immutable**; only mutate via
      `dispatch` / `tick` / `reset`.
- [ ] **Branch on `error.code`** (`JsonDeckErrorCodes`), never on `message` —
      see [ERRORS.md](./ERRORS.md).
- [ ] **Bound untrusted DSL size** before compiling (see limits below).
- [ ] Keep your own dependency on `zod` compatible (the only runtime dep).

## What core does NOT do (by design)

It is a headless, deterministic runtime. It does **not** provide: rendering
(Pixi/Canvas/DOM/React), a browser player or editor, asset loading
(images/sounds/fonts), input handling, animation, networking/multiplayer,
persistence, authentication, localization, JSON-Schema export, a CLI, or any
randomness (no RNG). Bring your own renderer, transport, and storage on top of
the ViewModel and `GameState`.

## Resource limits & DoS posture

The runtime is pure and bounded in some dimensions but not all. Built-in
guards (exported as `RUNTIME_LIMITS`):

| Limit                | Value       | Guard                                                                                                            |
| -------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `maxEventDepth`      | 32          | `emit_event` follow-up chains stop with `MAX_EVENT_DEPTH_EXCEEDED`.                                              |
| `maxExpressionDepth` | 64          | Deeply nested `payload`/`bind` stop resolving with an `EXPRESSION_RESOLUTION_ERROR` warning (no stack overflow). |
| numeric variables    | finite      | `set_var`/`modify_var` reject `NaN`/`Infinity`/overflow.                                                         |
| `tick(deltaMs)`      | finite, ≥ 0 | Invalid deltas return `INVALID_TICK_DELTA`, state unchanged.                                                     |

**Not yet bounded by the engine (enforce on your side for untrusted DSL):**

- `create_card.count` — a single command can create an arbitrarily large number
  of cards. Validate/clamp counts in untrusted DSL.
- Total cards / zones / rules / timers — large definitions cost proportional
  memory and CPU. Impose size limits on uploaded DSL before `compileGame`.
- Rules that `start_timer` every tick can grow the timer set unboundedly across
  many ticks — cap or reap on your side if the DSL is untrusted.

These are tracked for optional opt-in enforcement before 1.0.0 in
[ROADMAP.md](./ROADMAP.md) (item 9). Until then, **always size-bound untrusted
DSL** and run compilation/dispatch within your own time/CPU budget if you accept
adversarial input.

## Determinism

Given identical inputs, all functions produce identical outputs (no RNG, no
wall-clock, no I/O). This makes it safe for lockstep simulation, replays, and
server-side authoritative validation — provided every client uses the same
package version.

## Verifying a release

Before shipping an integration, the package itself is gated by (see
[RELEASES.md](./RELEASES.en.md#release-criteria)): `npm run check`,
`npm audit --omit=dev`, `npm pack --dry-run`, the consumer smoke
(ESM/CJS/TypeScript), the browser-bundle smoke, and the external fixture suite.
