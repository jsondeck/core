# Decision records

Lightweight log of decisions that deviate from, or clarify, the original ТЗ.

## ADR-001 — Package manager: npm (supersedes ТЗ's pnpm)

**Status:** Accepted · **Date:** 2026-06-17

### Context

The original ТЗ specifies pnpm (`pnpm install --frozen-lockfile`, `pnpm test`,
etc.) and a `pnpm-lock.yaml`. The development/CI environment used to build this
package does not have pnpm available, and the repository was bootstrapped and
verified end-to-end with npm.

### Decision

**npm is the canonical package manager for this repository.**

- Lockfile: `package-lock.json` (committed).
- CI installs with `npm ci`.
- All scripts in `package.json` are npm-based (`npm run check` runs
  `format:check → lint → typecheck → test → build`).
- The pnpm commands in the ТЗ map 1:1 to npm equivalents:

  | ТЗ (pnpm)                        | This repo (npm)     |
  | -------------------------------- | ------------------- |
  | `pnpm install --frozen-lockfile` | `npm ci`            |
  | `pnpm test`                      | `npm test`          |
  | `pnpm run typecheck`             | `npm run typecheck` |
  | `pnpm run build`                 | `npm run build`     |
  | `pnpm run lint`                  | `npm run lint`      |
  | `pnpm run check`                 | `npm run check`     |

### Consequences

- The ТЗ acceptance line "`pnpm test` proceeds" is satisfied by `npm test`.
- There is no `pnpm-lock.yaml`; `pnpm-lock.yaml` remains in `.gitignore` only as
  a guard and is not used.
- Consumers of the published package may still install it with any manager
  (`npm`/`yarn`/`pnpm add @jsondeck/core`); this decision concerns only the
  repository's own development toolchain.

### Reversal

To return to pnpm: install pnpm, run `pnpm import` to generate
`pnpm-lock.yaml` from `package-lock.json`, add `"packageManager": "pnpm@<v>"`
to `package.json`, switch CI to `pnpm install --frozen-lockfile`, and update the
docs. No source changes are required.
