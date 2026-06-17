# Roadmap to 1.0.0

`@jsondeck/core` is currently **0.1.0 (Beta)** — strong core, suitable for
controlled production integrations. This is the backlog that must close before
we label it an unconditional, GA-grade SDK and cut **1.0.0**.

Status legend: ✅ done · 🟡 partial · ⬜ planned.

## Blockers (must be closed before any "production-ready" claim)

| #   | Item                                                                                   | Status | Where                                                        |
| --- | -------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| 1   | npm artifact packaging: ship `examples/`, README links resolve on npmjs.com            | ✅     | `package.json` `files`, README absolute links                |
| 2   | Close `Runtime` mutable leak (`getState`/`reset`/`dispatch`/`tick` return clones)      | ✅     | `src/runtime/createRuntime.ts`                               |
| 3   | Strict event validation (types & shapes, not just presence)                            | ✅     | `src/rules/validateEvent.ts`                                 |
| 4   | Structured-error guards for inconsistent state (`validateState`, `safeBuildViewModel`) | ✅     | `src/runtime/validateState.ts`, `src/view/buildViewModel.ts` |
| 5   | Fix `accepted` contract in docs                                                        | ✅     | `docs/API.en.md`                                             |

## Required for a stable SDK

| #   | Item                                                                                                   | Status | Notes                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | Freeze public API + formal compatibility policy                                                        | 🟡     | Policy drafted in [COMPATIBILITY.md](./COMPATIBILITY.md); **freeze happens at 1.0.0**                                                                                 |
| 7   | Consumer CI smoke (tarball install, ESM/CJS import, TS compile, browser bundle)                        | ✅     | `scripts/consumer-smoke.sh`, CI `consumer-smoke` job + browser-bundle step                                                                                            |
| 8   | Hostile/untrusted input tests                                                                          | ✅     | `test/hostileInput.test.ts`                                                                                                                                           |
| 9   | Resource limits + DoS guidance                                                                         | 🟡     | `RUNTIME_LIMITS` (event/expression depth), finite-number guards; **`create_card.count` / total-card caps still consumer-side — see [PRODUCTION.md](./PRODUCTION.md)** |
| 10  | SDK-grade docs (quickstart, API, DSL, errors, examples, production checklist, "what core does not do") | 🟡     | Have: README, DSL, API, [ERRORS.md](./ERRORS.md), [PRODUCTION.md](./PRODUCTION.md). **Missing: migration guide (lands with DSL 0.2)**                                 |
| 11  | Release discipline + security policy for 0.x/1.x                                                       | ✅     | [RELEASES.md](./RELEASES.en.md) criteria, `SECURITY.md`, Changesets, npm provenance                                                                                   |
| 12  | Version status decision                                                                                | 🟡     | Stays **Beta** until this backlog closes; then 1.0.0                                                                                                                  |

## Remaining work to reach 1.0.0

- **API freeze (#6, #12).** Lock the public exports and the `GameState` shape;
  after 1.0.0 any breaking change is a major bump. Requires one release cycle of
  no API churn.
- **Optional DSL-budget enforcement (#9).** Decide whether to add opt-in caps
  (e.g. `compileGame(raw, { limits })`) for `create_card.count`, total cards,
  rules, and timers, or to keep these strictly consumer-side. Until then,
  untrusted DSL must be size/complexity-bounded by the integrator
  (see [PRODUCTION.md](./PRODUCTION.md)).
- **Migration guide (#10).** Author when DSL `0.2` / the first breaking API
  change is introduced.
- **Coverage gate.** Add a coverage threshold to CI before 1.0.0.

## Acceptance for the 1.0.0 label

All of: `npm run check` green · `npm audit --omit=dev` clean · `npm pack
--dry-run` clean · consumer smoke (ESM/CJS/TS) green · browser-bundle smoke green
· external fixture suite green · docs complete (incl. migration guide) · public
API frozen for one release cycle · no known P1/P2 contract gaps.
