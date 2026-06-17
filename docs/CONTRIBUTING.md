# Contributing to @jsondeck/core

Thank you for your interest in contributing! This document describes the development process, branch strategy, and release workflow.

## GitHub Flow

We follow [GitHub Flow](https://guides.github.com/introduction/flow/) for all development:

1. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Commit your changes** with clear, atomic commits:

   ```bash
   git commit -m "feat: add support for new condition type"
   ```

3. **Push your branch** to GitHub:

   ```bash
   git push origin feature/my-feature
   ```

4. **Open a Pull Request** with a description of your changes

5. **Await review** and address feedback

6. **Merge to main** only after CI passes and review is approved

## Branch Naming

Use descriptive branch names with lowercase, hyphens, and optional feature/ prefix:

- `feature/new-rule-type`
- `fix/timer-bug`
- `docs/api-clarification`
- `refactor/expression-parser`

Avoid generic names like `fix/bug` or `my-changes`.

## Commits

Write clear, conventional commit messages:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `test:` test additions/changes
- `refactor:` code reorganization (no behavior change)
- `chore:` dependencies, tooling, config

Example:

```
feat: implement card.has_tag condition evaluation

- Add ConditionEvaluator for card condition types
- Verify tag presence on card instances
- Handle missing cards gracefully with warnings

Fixes #42
```

## Development Workflow

### Toolchain

This repository uses **npm** (lockfile: `package-lock.json`). The original ТЗ
referenced pnpm; see [ADR-001](./DECISIONS.md#adr-001--package-manager-npm-supersedes-тзs-pnpm)
for the rationale and the pnpm→npm command mapping. Prettier is pinned to an
exact version so `format:check` is deterministic across machines and CI.

### Setup

```bash
npm install   # or `npm ci` for a clean, lockfile-exact install
```

### Running Checks

```bash
# Format check
npm run format:check

# Fix formatting
npm run format

# Lint
npm run lint

# Type checking
npm run typecheck

# Run tests
npm run test

# Watch mode during development
npm run test:watch

# Full check (all of the above + build)
npm run build
```

Before pushing, ensure all checks pass:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

### Writing Tests

Tests go in `test/` and use Vitest:

```typescript
import { describe, it, expect } from 'vitest';
import { compileGame, createInitialState } from '../src/index.js';

describe('myFeature', () => {
  it('should work correctly', () => {
    const game = compileGame({...});
    expect(game.id).toBe('test');
  });
});
```

Run tests with:

```bash
npm run test              # Run once
npm run test:watch       # Watch mode
```

### Adding Features

1. Add types in appropriate module (`dsl/types.ts`, `model/types.ts`, etc.)
2. Implement logic
3. Add comprehensive tests
4. Update documentation
5. For user-facing changes, update version metadata and CHANGELOG in the release PR

## Release Process

### Version Metadata

For any user-facing release, the release PR must update:

- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- docs/examples that mention the current version

Use SemVer:

- `patch` for bug fixes
- `minor` for new features
- `major` for breaking changes

Examples of changes requiring a version bump:

- New public API exports
- Changes to DSL syntax
- Bug fixes affecting behavior
- Dependency updates

**No version bump needed for:**

- Internal refactoring
- Test additions
- Documentation updates (unless they're new docs)
- CI/tooling changes

### Automated Release

When a release commit is merged to `main`:

1. GitHub Actions runs the release gates
2. If the committed package version is not already on npm, it publishes via npm
   Trusted Publishing
3. Maintainer creates the matching GitHub Release

For manual release (if needed):

```bash
npm run check
npm audit --omit=dev
npm pack --dry-run
```

Prefer fixing and rerunning the GitHub release workflow. Local token publishes
are emergency-only and must be followed by token rotation and a manual GitHub
Release note if provenance was unavailable.

## CI/CD

### Continuous Integration

GitHub Actions runs on every PR and push to `main`:

1. **Lint** — ESLint
2. **Type check** — TypeScript strict mode
3. **Tests** — Vitest suite
4. **Build** — tsc to dist/
5. **Audit** — `npm audit --omit=dev`
6. **Pack** — Dry-run npm pack

All checks must pass before merging.

### Release Workflow

Releases publish through npm Trusted Publishing. The workflow:

1. Runs on push to `main`
2. Runs the full release gates
3. Publishes the committed package version to npm with OIDC/provenance if it is
   not already published

**Required npm setup** (ask repository owner):

- npmjs.com Trusted Publisher for `@jsondeck/core`
- GitHub Actions publisher: `jsondeck/core`, workflow `release.yml`
- Allowed action: `npm publish`

## Code Style

- **TypeScript** — Strict mode, no `any`
- **Formatting** — Prettier (auto-format on commit)
- **Linting** — ESLint + @typescript-eslint
- **Imports** — ESM with `.js` extensions

## PR Checklist

Before opening a PR, ensure:

- [ ] Branch is off `main`
- [ ] Commits are atomic and well-described
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds
- [ ] No browser/DOM/Canvas dependencies introduced
- [ ] Tests cover new code
- [ ] Documentation updated (if needed)
- [ ] Changeset added (if user-facing change)

## Reviewing Code

When reviewing:

1. Check for correctness and edge cases
2. Verify no browser APIs are used
3. Ensure tests cover changes
4. Check TypeScript strictness
5. Verify immutability (no state mutations)
6. Look for determinism (no RNG, no Date.now())

## Questions?

- Open an issue for bugs/features
- Discuss in PR comments
- Check [API docs](./API.en.md) for context
- Review [DSL spec](./DSL.en.md) for game structure

Thank you for contributing!
