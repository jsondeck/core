# Error & warning catalog

Every error and warning produced by `@jsondeck/core` is a structured object:

```ts
interface JsonDeckError {
  code: string; // one of JsonDeckErrorCodes (autocompleted), forward-compatible
  message: string; // human-readable; do NOT branch on this text
  path?: string; // location in the DSL or state, e.g. "rules[0].then[1]"
  details?: unknown;
}
interface JsonDeckWarning {
  code: string;
  message: string;
  path?: string;
}
```

Branch on `code` (via the exported `JsonDeckErrorCodes` constant), never on
`message`. The same codes are used for both errors and (where applicable)
warnings.

```ts
import { JsonDeckErrorCodes } from '@jsondeck/core';

if (err.code === JsonDeckErrorCodes.UNKNOWN_CARD) {
  /* ... */
}
```

## Where each code appears

| Code                          | Surface                                | Meaning                                                                                                                                                                                                                               |
| ----------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DSL_VALIDATION_ERROR`        | compile (structural)                   | Zod schema failed: missing/mistyped required fields, bad `jsondeck` version, unknown command key.                                                                                                                                     |
| `SEMANTIC_VALIDATION_ERROR`   | compile (semantic)                     | Structurally valid but semantically wrong: duplicate ids, unknown literal type/zone/variable, `create_card.count` not a positive integer, `start_timer.duration_ms <= 0`, multi-key command, bad HUD expression, reserved `__jd_` id. |
| `UNKNOWN_CARD_TYPE`           | runtime (command)                      | `create_card` resolved to a card type that does not exist.                                                                                                                                                                            |
| `UNKNOWN_ZONE`                | runtime (command)                      | `move_card` / `create_card` resolved to a zone that does not exist.                                                                                                                                                                   |
| `UNKNOWN_CARD`                | runtime (command/condition)            | A referenced card id does not exist (also emitted as a **warning** from card conditions).                                                                                                                                             |
| `UNKNOWN_VARIABLE`            | runtime (command)                      | `set_var` / `modify_var` named a variable that does not exist.                                                                                                                                                                        |
| `INVALID_VARIABLE_TYPE`       | runtime (command)                      | Type/finiteness mismatch: `set_var` value type, `modify_var` on a non-number, non-finite add, or numeric overflow.                                                                                                                    |
| `INVALID_COMMAND`             | runtime (command)                      | Command object did not match any known command.                                                                                                                                                                                       |
| `COMMAND_EXECUTION_ERROR`     | runtime (command)                      | A command failed to apply (e.g. non-finite `move_card` coordinate, non-positive resolved `start_timer.duration_ms`).                                                                                                                  |
| `EXPRESSION_RESOLUTION_ERROR` | runtime (warning)                      | A `$`-expression referenced a missing path/variable, or `maxExpressionDepth` was exceeded. Non-fatal.                                                                                                                                 |
| `RULE_EXECUTION_ERROR`        | runtime                                | Reserved for rule-level execution failures.                                                                                                                                                                                           |
| `INVALID_EVENT`               | runtime (dispatch)                     | The event is not an object, has a non-string/unknown `type`, or a built-in event has missing/mistyped required fields.                                                                                                                |
| `INVALID_TICK_DELTA`          | runtime (tick)                         | `tick(deltaMs)` received a non-finite or negative delta; state is returned unchanged.                                                                                                                                                 |
| `MAX_EVENT_DEPTH_EXCEEDED`    | runtime (dispatch)                     | `emit_event` follow-up chain hit `RUNTIME_LIMITS.maxEventDepth`.                                                                                                                                                                      |
| `INVALID_STATE`               | `validateState` / `safeBuildViewModel` | A supplied `GameState` is inconsistent with the game (missing zone, wrong variable type, broken card⇄zone invariant).                                                                                                                 |

## How errors are surfaced

- **`compileGame(raw)`** throws `JsonDeckCompileError` (with `.errors` and
  `.warnings`); its `message` summarizes the first error.
- **`safeCompileGame(raw)`** never throws — returns
  `{ ok: false, errors, warnings }`.
- **`dispatchEvent` / `tick`** never throw for invalid input — errors and
  warnings are aggregated on the returned `DispatchResult` / `TickResult`, and a
  rejected/failed rule leaves state unchanged (transactional rollback).
- **`validateState` / `safeBuildViewModel`** never throw — they return
  structured `INVALID_STATE` errors.
