# @jsondeck/core external fixture suite report

Suite: `jsondeck-core-runtime-fixtures` v1.0.0 (16 upstream cases) **+ 3 edge
cases added in this repo** (V06, R06, R07) = **19 cases total**.
Branch: `feature/core-v0-runtime` (see latest commit).
Date: 2026-06-17
Node version: v20.19.0
npm version: 10.8.2
Package manager: **npm** (canonical; see [ADR-001](./DECISIONS.md)). pnpm is not
used in this repo; the commands below are the npm equivalents of the ТЗ's pnpm
pipeline.

## Package pipeline

| Command (npm)            | = ТЗ (pnpm)                        |  Result |
| ------------------------ | --------------------------------- | ------: |
| `npm ci`                 | `pnpm install --frozen-lockfile`  |    pass |
| `npm run format:check`   | (prettier, pinned 3.8.4)          |    pass |
| `npm run lint`           | `pnpm run lint`                   |    pass |
| `npm run typecheck`      | `pnpm run typecheck` (src + test) |    pass |
| `npm test`               | `pnpm test` — **101 tests**       |    pass |
| `npm run build`          | `pnpm run build`                  |    pass |
| `npm pack --dry-run`     | —                                 |    pass |

`npm run check` runs format:check → lint → typecheck → test → build and is green.

## Fixture results (19/19)

| Case | Fixture | Compile | Runtime | Verdict | Notes |
| ---- | ------- | ------: | ------: | ------- | ----- |
| V01 | valid/01_generic_card_interaction.json | ok | ok | PASS | timer → tick removes target, 3× `__jd_card_1..3`, counter=3, HUD=3 |
| V02 | valid/02_immutability_probe.json | ok | ok | PASS | input byte-identical before/after dispatch & tick; counter 1→11 |
| V03 | valid/03_emit_event_chain.json | ok | ok | PASS | total=4, done, last=root; emitted step_one+step_two aggregated |
| V04 | valid/04_timer_order_and_deferred.json | ok | ok | PASS | seq order `_1`→`_2`; deferred timer fires only next tick |
| V05 | valid/05_viewmodel_layout_hud_theme.json | ok | ok | PASS | layouts/theme/HUD; free_2 z=0 (spec §18) |
| **V06** | **valid/06_expression_references_in_commands.json** | ok | ok | **PASS** | **`$`-exprs in move_card.to_zone / create_card.type / create_card.zone compile & resolve; 2 spawned cards in target_zone** |
| I01 | invalid/01_structural_missing_required_fields.json | rejected | n/a | PASS | 6× DSL_VALIDATION_ERROR with paths |
| I02 | invalid/02_duplicate_unknown_reserved_initial_cards.json | rejected | n/a | PASS | dup id / unknown type / unknown zone / reserved `__jd_` |
| I03 | invalid/03_command_multiple_keys.json | rejected | n/a | PASS | SEMANTIC_VALIDATION_ERROR (one-key rule, §8.2) |
| I04 | invalid/04_command_bad_literal_values.json | rejected | n/a | PASS | count 0/-1/1.5/"3" + duration 0/"100" |
| I05 | invalid/05_variables_rules_hud_semantic_errors.json | rejected | n/a | PASS | var type / dup rule / dup hud / hud `$` / missing var |
| I06 | invalid/06_bad_event_prefixes.json | rejected | n/a | PASS | bad rule.on + non-`custom.` emit |
| R01 | runtime-negative/01_transaction_rollback_unknown_card.json | ok | ok | PASS | UNKNOWN_CARD → full-rule rollback; input unchanged |
| R02 | runtime-negative/02_set_var_type_mismatch_via_expression.json | ok | ok | PASS | INVALID_VARIABLE_TYPE; n stays 0; rollback |
| R03 | runtime-negative/03_modify_var_non_number_add_via_expression.json | ok | ok | PASS | INVALID_VARIABLE_TYPE; n stays 0; rollback |
| R04 | runtime-negative/04_conditions_warnings_no_execute.json | ok | ok | PASS | warning UNKNOWN_CARD; rule skipped; flag false |
| R05 | runtime-negative/05_max_event_depth_loop.json | ok | ok | PASS | MAX_EVENT_DEPTH_EXCEEDED; counter=33; no hang |
| **R06** | **runtime-negative/06_move_card_bad_coordinate_type.json** | ok | ok | **PASS** | **move_card.x→string ⇒ COMMAND_EXECUTION_ERROR; marker rolled back to 0; card stays in zone_a; input unchanged** |
| **R07** | **runtime-negative/07_invalid_event_shape.json** | ok | ok | **PASS** | **dispatch null / {} / { type: 123 } ⇒ INVALID_EVENT, no throw, no mutation** |

## Edge cases added in this repo (beyond upstream v1.0.0)

These exercise three reviewer-requested behaviours:

```json
{
  "V06": "Semantic validation must NOT treat $-expressions as literal references for move_card.to_zone / create_card.type / create_card.zone.",
  "R06": "Runtime move_card.x/y must be a finite number; otherwise COMMAND_EXECUTION_ERROR and the whole rule transaction rolls back.",
  "R07": "validateEvent must return INVALID_EVENT (never throw a TypeError) for null, {}, and { type: 123 }."
}
```

Covered by `test/externalRuntimeFixtures.test.ts` (V06, R06, R07) and mirrored in
`scripts/run-external-suite.mjs`.

## Critical checks (README §57)

| # | Check | Result |
| - | ----- | ------ |
| 1 | `dispatchEvent`/`tick` do not mutate input GameState | pass (V02, R01–R04, R06, R07) |
| 2 | A command must have exactly one key | pass (I03) |
| 3 | `set_var`/`modify_var` cannot break declared variable type | pass (R02, R03) |
| 4 | An error inside a rule rolls back the whole rule transaction | pass (R01, R06) |
| 5 | `emit_event` follow-ups run after the parent and appear in the result | pass (V03) |
| 6 | Timers created inside `tick` are not processed in the same `tick` | pass (V04) |
| 7 | Compile errors are structured: `code`, `message`, `path` | pass (I01–I06) |
| 8 | `$`-expression command refs are not validated as literals | pass (V06) |
| 9 | Non-number `move_card` coordinates error + rollback | pass (R06) |
| 10 | Malformed events return `INVALID_EVENT`, never throw | pass (R07) |

## Developer conclusion

- **Fully compliant: yes — and this claim is gated.** It may read "yes" only
  while BOTH of the following hold (both currently do):
  - `npm run check` is green (format · lint 0 warnings · typecheck src+test ·
    full test suite · build), and
  - all 19 fixtures (16 upstream + 3 edge: V06, R06, R07) pass.
  If either regresses, this line must be set back to "no" with the failing
  case(s) listed in the table above.
- Known deviations from ТЗ: none. Two interpretation notes:
  - R04: `all` short-circuits, so only the first failing sub-condition's warning
    (`UNKNOWN_CARD`) surfaces; the manifest permits "and/or", so this conforms.
  - Toolchain is npm, not pnpm (ADR-001).
- Tests in repo: `test/externalRuntimeFixtures.test.ts`,
  `test/fixtures/external-runtime-suite/**`, `scripts/run-external-suite.mjs`.
- PR: https://github.com/jsondeck/core/pull/1
