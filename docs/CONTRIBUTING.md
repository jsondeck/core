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
5. Create a changeset (see below)

## Release Process

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning and release notes.

**For any user-facing change**, add a changeset:

```bash
npx changeset add
```

This creates a file in `.changeset/` describing your change. Include:

- `patch` for bug fixes
- `minor` for new features
- `major` for breaking changes

Examples of changes requiring changesets:

- New public API exports
- Changes to DSL syntax
- Bug fixes affecting behavior
- Dependency updates

**No changeset needed for:**

- Internal refactoring
- Test additions
- Documentation updates (unless they're new docs)
- CI/tooling changes

### Automated Release

When a changeset is committed to `main`:

1. GitHub Actions detects it
2. Creates a Release PR updating version + CHANGELOG
3. On merge, automatically publishes to npm

For manual release (if needed):

```bash
npm run build
npm publish --provenance
```

## CI/CD

### Continuous Integration

GitHub Actions runs on every PR and push to `main`:

1. **Lint** — ESLint
2. **Type check** — TypeScript strict mode
3. **Tests** — Vitest suite
4. **Build** — tsc to dist/
5. **Pack** — Dry-run npm pack

All checks must pass before merging.

### Release Workflow

Releases are automatic via Changesets. The workflow:

1. Detects changesets on `main`
2. Creates version bump PR
3. On merge, publishes to npm with provenance

**Required secrets** (ask repository owner):

- `NPM_TOKEN` — npm publish token

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
