# Release Lifecycle

How `@jsondeck/core` versions and releases are managed.

## Versioning

We follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR** — Breaking changes to DSL or runtime behavior
- **MINOR** — New backward-compatible features
- **PATCH** — Bug fixes

Current version: **0.1.1** (beta)

## Release Criteria

A version is only cut when **all** of the following hold on `main`:

1. `npm run check` is green: `format:check`, `lint` (0 warnings), `typecheck`
   (covers `src` **and** `test`), the full test suite, and `build`.
2. The external fixture suite passes (`test/externalRuntimeFixtures.test.ts`,
   currently 19/19).
3. `npm pack --dry-run` produces a clean tarball (no source maps; only
   `dist`, `examples`, README, LICENSE, CHANGELOG).
4. The browser bundle smoke step passes (the package bundles for `platform=browser`
   with no Node-only APIs).
5. `npm audit --omit=dev` reports 0 vulnerabilities in runtime dependencies.
6. A Changeset describes every user-facing change, and the CHANGELOG is updated.

### `0.x` stability contract

While on `0.x`:

- The DSL v0.1 grammar and the public runtime API may change between **minor**
  versions; breaking changes are called out in the CHANGELOG and the Changeset.
- Patch releases never change the DSL or the public API shape.
- Adopters should **pin an exact version** and upgrade deliberately.

`1.0.0` will freeze the DSL v0.1 grammar and the public API: after it, any
breaking change requires a **major** bump.

## Release Process

Releases use [Changesets](https://github.com/changesets/changesets) for automation.

### Workflow

1. **Create changeset** on feature branch:

   ```bash
   npx changeset add
   ```

2. **Merge to main** — Changeset file committed

3. **GitHub Actions** detects changeset:
   - Creates Release PR with version bump + CHANGELOG
   - Lists all changes to review

4. **Merge Release PR** — Triggers publish:
   - npm publish automatic
   - GitHub Release created
   - CHANGELOG updated

### Changeset Format

When you run `npx changeset add`, answer:

1. Which packages changed? (select: @jsondeck/core)
2. What type? (select: patch, minor, major)
3. Describe the change (will be in CHANGELOG)

Example description:

```
Fix timer remainingMs calculation in tick()

- Timers now correctly decrease remainingMs even if not processed
- New timers created during tick still start fresh next tick
```

### What Needs a Changeset?

**YES, add changeset for:**

- New public API exports
- Changes to DSL syntax
- Bug fixes affecting behavior
- Major version updates

**NO changeset needed for:**

- Internal refactoring
- Test additions
- Documentation updates (except new docs)
- CI/tooling changes

## Publishing Credentials

The normal release path uses npm Trusted Publishing through GitHub Actions OIDC,
not a long-lived publish token.

Repository owner must configure the package on npmjs.com:

- Package: `@jsondeck/core`
- Trusted publisher: GitHub Actions
- Organization/repository: `jsondeck` / `core`
- Workflow filename: `release.yml`
- Allowed action: `npm publish`

The GitHub workflow must keep `id-token: write`, use Node `>=22.14.0`, and use
npm CLI `>=11.5.1`. The checked-in workflow uses Node 24 and installs npm 11.

Only keep an `NPM_TOKEN` as an explicit emergency fallback. If it is ever used
for a local/token publish, rotate it immediately after the release.

## Manual Release

If automated publishing fails, fix the GitHub workflow or npm Trusted Publisher
configuration and rerun from CI. A local manual publish is an emergency-only
escape hatch and does **not** satisfy the provenance/OIDC release gate.

Before any emergency publish:

```bash
npm run check
npm audit --omit=dev
npm pack --dry-run
```

Then manually create the matching GitHub Release and document whether provenance
was unavailable.

## Stability

Current status: **BETA (0.1.x)**

- DSL v0.1 may change before 1.0
- Runtime API is stable
- No data format guarantees

Version 1.0.0 will mark:

- DSL v0.1 finalized
- API frozen (breaking changes trigger MAJOR)
- Production readiness

## Changelog

Maintained in [CHANGELOG.md](../CHANGELOG.md) following [Keep a Changelog](https://keepachangelog.com/).

Format:

```markdown
## [0.1.1] - 2026-06-17

### Fixed

- Same-event rules observe freshly committed `$vars`
- State-aware card/zone event reference validation
- Condition arity validation

## [0.1.0] - 2024-06-16

### Added

- JSON DSL v0.1 support
- compileGame and safeCompileGame functions

### Fixed

- Timer processing order consistency
```

## See Also

- [CONTRIBUTING.md](./CONTRIBUTING.md) — Development workflow
- [package.json](../package.json) — Build and publish scripts
