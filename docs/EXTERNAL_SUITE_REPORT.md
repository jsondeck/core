# @jsondeck/core external fixture suite report

Suite: `jsondeck-core-runtime-fixtures` v1.0.0 (16 cases)
Commit / branch: `6fcffc7` on `feature/core-v0-runtime`
Date: 2026-06-17
Node version: v20.19.0
npm version: 10.8.2
pnpm version: **not installed in this environment — npm equivalents were run (project is standardized on npm; see note below)**

> Toolchain note: the ТЗ/template reference `pnpm`. This repo was standardized on
> **npm** (lockfile `package-lock.json`, CI uses `npm ci`). The commands below are
> the exact npm equivalents of the requested pnpm pipeline.

## Package pipeline

| Command                                       |   Result | Notes                                                                                                |
| --------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------- |
| `npm ci` (= `pnpm install --frozen-lockfile`) | **pass** | Installs cleanly, no `--legacy-peer-deps` needed (peer-dep conflict fixed via typescript-eslint v8). |
| `npm test` (= `pnpm test`)                    | **pass** | 9 files, **92 tests** (76 unit + 16 external suite).                                                 |
| `tsc --noEmit` (= `pnpm run typecheck`)       | **pass** | 0 errors.                                                                                            |
| `npm run build` (= `pnpm run build`)          | **pass** | Emits `dist/index.js` + `dist/index.d.ts`.                                                           |
| `npm run lint` (= `pnpm run lint`)            | **pass** | 0 errors, 23 warnings (all `no-explicit-any`/unused in test files; non-blocking).                    |
| `npm pack --dry-run`                          | **pass** | Tarball `jsondeck-core-0.1.0.tgz`, only `dist/` + README/LICENSE/CHANGELOG.                          |

## Fixture results

Run twice: **initial** (commit `459a94e`, pre-fix) → **final** (commit `6fcffc7`, post-fix).
Initial: 14/16. Final: **16/16**.

| Case | Fixture                                                           |  Compile | Runtime | Expected                                                                                                   | Actual                                                                                                           | Verdict              | Notes                                                                                          |
| ---- | ----------------------------------------------------------------- | -------: | ------: | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| V01  | valid/01_generic_card_interaction.json                            |       ok |      ok | timer created; tick removes card_b_1; 3× result `__jd_card_1..3`; counter=3; HUD=3                         | exactly as expected                                                                                              | **PASS**             | —                                                                                              |
| V02  | valid/02_immutability_probe.json                                  |       ok |      ok | move+flip+vars; input unchanged; 1 timer remaining 50ms; counter 11                                        | as expected; input byte-identical before/after dispatch & tick                                                   | **PASS**             | Confirms criterion 4 (no input mutation) on a multi-branch state.                              |
| V03  | valid/03_emit_event_chain.json                                    |       ok |      ok | total=4, done=true, last=root; executedRules has 3 rules; emittedEvents include step_one **and** step_two  | initially emittedEvents=`[step_one]` only → **fixed** to `[step_one, step_two]`                                  | **PASS** (after fix) | Impl gap: follow-up emissions weren't aggregated. Fixed in `6fcffc7`.                          |
| V04  | valid/04_timer_order_and_deferred.json                            |       ok |      ok | seq order `__jd_timer_1`→`_2`; marker 2; deferred pending; after tick 1 marker 3, final true               | exactly as expected                                                                                              | **PASS**             | Confirms criterion 7 (seq order + deferred-timer rule).                                        |
| V05  | valid/05_viewmodel_layout_hud_theme.json                          |       ok |      ok | 11 cards; theme size/style; free_1 (10,20,z=5); **free_2 (0,0,z=0)**; row gap=8; grid 2-col; HUD 42/layout | initially free_2 `z=1` → **fixed** to `z=0`                                                                      | **PASS** (after fix) | Impl bug vs spec §18 (`z = card.z ?? 0` for free). Fixed in `6fcffc7`.                         |
| I01  | invalid/01_structural_missing_required_fields.json                | rejected |     n/a | ok:false; DSL_VALIDATION_ERROR w/ paths                                                                    | ok:false; 6× `DSL_VALIDATION_ERROR` paths `title/table/zones/cardTypes/initialState/rules`                       | **PASS**             | —                                                                                              |
| I02  | invalid/02_duplicate_unknown_reserved_initial_cards.json          | rejected |     n/a | ok:false; SEMANTIC errors: dup id, unknown type, unknown zone, reserved `__jd_`                            | ok:false; 5× `SEMANTIC_VALIDATION_ERROR` covering all four                                                       | **PASS**             | —                                                                                              |
| I03  | invalid/03_command_multiple_keys.json                             | rejected |     n/a | ok:false; **SEMANTIC_VALIDATION_ERROR** or INVALID_COMMAND for 2-key command                               | initially `DSL_VALIDATION_ERROR` (structural) → **fixed** to `SEMANTIC_VALIDATION_ERROR` path `rules[0].then[0]` | **PASS** (after fix) | Classification deviation vs spec §8.2. Fixed via `.passthrough()` wrappers.                    |
| I04  | invalid/04_command_bad_literal_values.json                        | rejected |     n/a | ok:false; errors for count 0/-1/1.5/"3" and duration 0/"100"                                               | ok:false; 6× `SEMANTIC_VALIDATION_ERROR`, one per bad literal                                                    | **PASS**             | —                                                                                              |
| I05  | invalid/05_variables_rules_hud_semantic_errors.json               | rejected |     n/a | ok:false; var type mismatch, dup rule.id, dup hud.id, hud w/o `$`, hud missing var                         | ok:false; `SEMANTIC_VALIDATION_ERROR` for all five                                                               | **PASS**             | —                                                                                              |
| I06  | invalid/06_bad_event_prefixes.json                                | rejected |     n/a | ok:false; bad rule.on values + non-`custom.` emit type                                                     | ok:false; `SEMANTIC_VALIDATION_ERROR` for `bad.event`, `game.custom_event`, emit `card.clicked`                  | **PASS**             | —                                                                                              |
| R01  | runtime-negative/01_transaction_rollback_unknown_card.json        |       ok |      ok | errors; rule not executed; returned state == initial; input unchanged                                      | UNKNOWN_CARD; executedRules=[]; accepted=false; state==snapshot; input unchanged                                 | **PASS**             | Confirms criterion 5 (full-rule rollback).                                                     |
| R02  | runtime-negative/02_set_var_type_mismatch_via_expression.json     |       ok |      ok | INVALID_VARIABLE_TYPE/COMMAND_EXECUTION_ERROR; accepted false; n stays 0; input unchanged                  | `INVALID_VARIABLE_TYPE`; accepted=false; n=0; input unchanged                                                    | **PASS**             | `set_var n = $vars.text("oops")` rejected + rolled back.                                       |
| R03  | runtime-negative/03_modify_var_non_number_add_via_expression.json |       ok |      ok | INVALID_VARIABLE_TYPE/COMMAND_EXECUTION_ERROR; accepted false; n stays 0; input unchanged                  | `INVALID_VARIABLE_TYPE`; accepted=false; n=0; input unchanged                                                    | **PASS**             | `modify_var n += $vars.text("x")` rejected + rolled back.                                      |
| R04  | runtime-negative/04_conditions_warnings_no_execute.json           |       ok |      ok | accepted false; warnings UNKNOWN_CARD/ZONE; flag false; no mutation                                        | accepted=false; warnings=`[UNKNOWN_CARD]`; flag=false; input unchanged                                           | **PASS**             | `all` short-circuits on first false, so only UNKNOWN_CARD surfaces (manifest allows "and/or"). |
| R05  | runtime-negative/05_max_event_depth_loop.json                     |       ok |      ok | terminates; MAX_EVENT_DEPTH_EXCEEDED; counter finite & deterministic; no hang                              | terminates in ~0ms; `MAX_EVENT_DEPTH_EXCEEDED`; counter=**33** (deterministic)                                   | **PASS**             | Depth cap = 32; rule fires at depths 0..32 → counter 33.                                       |

## Required diffs for failures

All three deviations were found on the initial run and fixed in commit `6fcffc7`.

```json
{
  "case": "V03",
  "step": "dispatch game.started — follow-up emit telemetry",
  "before": {
    "emittedEvents": ["custom.step_one"],
    "executedRules": ["emit_step_one", "handle_step_one", "handle_step_two"],
    "vars": { "total": 4, "done": true, "last": "root" }
  },
  "after": { "emittedEvents": ["custom.step_one", "custom.step_two"] },
  "classification": "implementation gap",
  "spec": "§12 step 6 (aggregate follow-up telemetry) — emittedEvents was not aggregated, only matched/executed/commands were",
  "fix": "src/rules/dispatchEvent.ts — aggregatedEmitted collects followUp.emittedEvents",
  "covered_by": "test/externalRuntimeFixtures.test.ts V03"
}
```

```json
{
  "case": "V05",
  "step": "buildViewModel — free-layout z default",
  "before": { "free_2": { "x": 0, "y": 0, "z": 1 } },
  "after": { "free_2": { "x": 0, "y": 0, "z": 0 } },
  "classification": "implementation bug",
  "spec": "§18: for `free` layout `z = card.z ?? 0`; code used `card.z ?? idx`",
  "fix": "src/view/buildViewModel.ts — default z = card.z ?? 0",
  "covered_by": "test/externalRuntimeFixtures.test.ts V05"
}
```

```json
{
  "case": "I03",
  "step": "safeCompileGame — 2-key command object",
  "before": { "ok": false, "codes": ["DSL_VALIDATION_ERROR"], "path": "rules.0.then.0" },
  "after": { "ok": false, "codes": ["SEMANTIC_VALIDATION_ERROR"], "path": "rules[0].then[0]" },
  "classification": "spec-classification deviation (input was always rejected; only the error code differed)",
  "spec": "§8.2 classifies 'exactly one command key' as a SEMANTIC rule; strict zod caught it earlier as structural",
  "fix": "src/dsl/schema.ts — outer command wrappers use .passthrough() (params stay .strict()), so the semantic one-key check classifies it",
  "covered_by": "test/externalRuntimeFixtures.test.ts I03 + test/commands.test.ts"
}
```

## Critical checks (README §57)

| #   | Check                                                                 | Result                                              |
| --- | --------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | `dispatchEvent`/`tick` do not mutate input GameState                  | **pass** (V02, R01–R04 assert byte-identical input) |
| 2   | A command must have exactly one key                                   | **pass** (I03 → SEMANTIC_VALIDATION_ERROR)          |
| 3   | `set_var`/`modify_var` cannot break declared variable type            | **pass** (R02, R03)                                 |
| 4   | An error inside a rule rolls back the whole rule transaction          | **pass** (R01)                                      |
| 5   | `emit_event` follow-ups run after the parent and appear in the result | **pass** (V03)                                      |
| 6   | Timers created inside `tick` are not processed in the same `tick`     | **pass** (V04 deferred timer)                       |
| 7   | Compile errors are structured: `code`, `message`, `path`              | **pass** (all I01–I06)                              |

## Developer conclusion

- Fully compliant: **yes** (16/16 after fixes)
- Known deviations from ТЗ: none remaining. Two minor interpretation notes:
  - R04: `all` short-circuits, so only the first failing sub-condition's warning
    (`UNKNOWN_CARD`) is emitted; manifest permits "and/or", so this conforms.
  - Toolchain is npm, not pnpm (environment lacks pnpm); pipeline equivalents pass.
- Tests added to repo: `test/externalRuntimeFixtures.test.ts`,
  `test/fixtures/external-runtime-suite/**`, `scripts/run-external-suite.mjs`
- Fix commit: `6fcffc7` (branch `feature/core-v0-runtime`, PR
  https://github.com/jsondeck/core/pull/1)
