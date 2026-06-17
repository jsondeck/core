# Roadmap to 1.0.0

`@jsondeck/core` is currently **0.1.1 (Beta)** — suitable for controlled
production integrations, but not yet an unconditional GA-grade SDK. The 0.1.1
hotfix closes the known runtime contract gaps from the first beta; this backlog
is what must close before **1.0.0**.

Status legend: ✅ done · 🟡 partial · ⬜ planned.

## Blockers (must be closed before any "production-ready" claim)

| #   | Item                                                                                   | Status | Where                                                        |
| --- | -------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| 1   | npm artifact packaging: ship `examples/`, README links resolve on npmjs.com            | ✅     | `package.json` `files`, README absolute links                |
| 2   | Close `Runtime` mutable leak (`getState`/`reset`/`dispatch`/`tick` return clones)      | ✅     | `src/runtime/createRuntime.ts`                               |
| 3   | Strict event validation (types & shapes, not just presence)                            | ✅     | `src/rules/validateEvent.ts`                                 |
| 4   | Structured-error guards for inconsistent state (`validateState`, `safeBuildViewModel`) | ✅     | `src/runtime/validateState.ts`, `src/view/buildViewModel.ts` |
| 5   | Fix `accepted` contract in docs                                                        | ✅     | `docs/API.en.md`                                             |
| 6   | Same-event rule context uses freshly committed `$vars`                                 | ✅     | `src/rules/dispatchEvent.ts`                                 |
| 7   | State-aware card/zone event reference validation                                       | ✅     | `src/rules/validateEvent.ts`                                 |
| 8   | Release workflow uses npm Trusted Publishing instead of long-lived publish tokens      | ✅     | `.github/workflows/release.yml`, npm package settings        |

## Required for a stable SDK

| #   | Item                                                                                                   | Status | Notes                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | Freeze public API + formal compatibility policy                                                        | 🟡     | Policy drafted in [COMPATIBILITY.md](./COMPATIBILITY.md); **freeze happens at 1.0.0**                                                                                 |
| 10  | Consumer CI smoke (tarball install, ESM/CJS import, TS compile, browser bundle)                        | ✅     | `scripts/consumer-smoke.sh`, CI `consumer-smoke` job + browser-bundle step                                                                                            |
| 11  | Hostile/untrusted input tests                                                                          | ✅     | `test/hostileInput.test.ts`                                                                                                                                           |
| 12  | Resource limits + DoS guidance                                                                         | 🟡     | `RUNTIME_LIMITS` (event/expression depth), finite-number guards; **`create_card.count` / total-card caps still consumer-side — see [PRODUCTION.md](./PRODUCTION.md)** |
| 13  | SDK-grade docs (quickstart, API, DSL, errors, examples, production checklist, "what core does not do") | 🟡     | Have: README, DSL, API, [ERRORS.md](./ERRORS.md), [PRODUCTION.md](./PRODUCTION.md). **Missing: migration guide (lands with DSL 0.2)**                                 |
| 14  | Release discipline + security policy for 0.x/1.x                                                       | ✅     | [RELEASES.md](./RELEASES.en.md) criteria, `SECURITY.md`, Changesets, npm Trusted Publishing/provenance                                                                |
| 15  | Version status decision                                                                                | 🟡     | Stays **Beta** until this backlog closes; then 1.0.0                                                                                                                  |

## External integration trial

A standalone consumer (outside this repo) installed the packed tarball and
exercised the full public surface end to end: compile → `createInitialState` →
ASCII render of `buildViewModel` → `drag_started`/`dropped_on_card` →
`tick(5000)` → render again → JSON persist/restore → `validateState` (incl. a
corrupted-state negative case) → error handling for invalid event/DSL. All green;
ESM/CJS/TS consumption already covered by the consumer smoke.

Consumer feedback (candidates for 1.0.0, not blockers):

- **Timers are absent from the ViewModel.** A player that wants a countdown/
  progress UI must read `GameState.timers` directly. Consider surfacing active
  timers (id, remaining/duration) in `GameViewModel`.

## Remaining work to reach 1.0.0

- **API freeze (#9, #15).** Lock the public exports and the `GameState` shape;
  after 1.0.0 any breaking change is a major bump. Requires one release cycle of
  no API churn.
- **Optional DSL-budget enforcement (#12).** Decide whether to add opt-in caps
  (e.g. `compileGame(raw, { limits })`) for `create_card.count`, total cards,
  rules, and timers, or to keep these strictly consumer-side. Until then,
  untrusted DSL must be size/complexity-bounded by the integrator
  (see [PRODUCTION.md](./PRODUCTION.md)).
- **Migration guide (#13).** Author when DSL `0.2` / the first breaking API
  change is introduced.
- **Timers in ViewModel (consumer feedback).** Evaluate exposing active timers in
  `GameViewModel` so renderers don't reach into `GameState`.
- **Coverage gate.** Add a coverage threshold to CI before 1.0.0.
- **External consumer in CI.** Promote the integration trial into a maintained
  sample app / CI check.

## Acceptance for the 1.0.0 label

All of: `npm run check` green · `npm audit --omit=dev` clean · `npm pack
--dry-run` clean · consumer smoke (ESM/CJS/TS) green · browser-bundle smoke green
· external fixture suite green · docs complete (incl. migration guide) · public
API frozen for one release cycle · known P1/P2 contract gaps found during beta
are either fixed or explicitly tracked before GA.
