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

Current version: **0.1.0** (beta)

## Release Criteria

A version is only cut when **all** of the following hold on `main`:

1. `npm run check` is green: `format:check`, `lint` (0 errors), `typecheck`
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

## Secrets Required

Repository owner must configure:

- **NPM_TOKEN** — npm publish token with write access to @jsondeck scope

Add via GitHub repo settings → Secrets and variables → Actions.

## Manual Release

If automated process fails:

```bash
npm run build
npm publish --provenance --access public
```

Then manually create GitHub Release with tag v0.1.0.

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
