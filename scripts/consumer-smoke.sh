#!/usr/bin/env bash
# Consumer smoke test: pack the package, install it into a throwaway consumer,
# and verify ESM import, CJS dynamic import, and TypeScript declaration compile.
# Run locally with: bash scripts/consumer-smoke.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building and packing"
npm run build >/dev/null
TARBALL="$(npm pack --silent)"
TARBALL_ABS="$ROOT/$TARBALL"
echo "    packed: $TARBALL"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"; rm -f "$TARBALL_ABS"' EXIT
cd "$WORK"

echo "==> Installing tarball into a fresh consumer ($WORK)"
npm init -y >/dev/null
npm install "$TARBALL_ABS" >/dev/null

GAME_JSON='{"jsondeck":"0.1","id":"smoke","title":"Smoke","table":{"width":800,"height":600,"camera":{"mode":"fixed"}},"zones":{"z":{"type":"free_space","layout":"free"}},"cardTypes":{},"initialState":{"cards":[]},"rules":[]}'

echo "==> ESM import"
cat > esm.mjs <<EOF
import { compileGame, createInitialState, buildViewModel, RUNTIME_LIMITS } from '@jsondeck/core';
const g = compileGame($GAME_JSON);
const s = createInitialState(g);
const vm = buildViewModel(g, s);
if (vm.table.width !== 800) throw new Error('ESM: unexpected view model');
if (RUNTIME_LIMITS.maxEventDepth !== 32) throw new Error('ESM: limits export broken');
console.log('    ESM ok');
EOF
node esm.mjs

echo "==> CJS dynamic import"
cat > cjs.cjs <<EOF
(async () => {
  const mod = await import('@jsondeck/core');
  const g = mod.compileGame($GAME_JSON);
  const s = mod.createInitialState(g);
  if (mod.buildViewModel(g, s).table.height !== 600) throw new Error('CJS: unexpected view model');
  console.log('    CJS ok');
})().catch((e) => { console.error(e); process.exit(1); });
EOF
node cjs.cjs

echo "==> TypeScript consumer compile"
cat > consumer.ts <<'EOF'
import {
  compileGame,
  createInitialState,
  dispatchEvent,
  buildViewModel,
  safeBuildViewModel,
  validateState,
  RUNTIME_LIMITS,
} from '@jsondeck/core';
import type {
  CompiledGame,
  GameState,
  GameViewModel,
  DispatchResult,
  JsonDeckErrorCode,
} from '@jsondeck/core';

declare const raw: unknown;
const game: CompiledGame = compileGame(raw);
const state: GameState = createInitialState(game);
const res: DispatchResult = dispatchEvent(game, state, { type: 'game.started' });
const vm: GameViewModel = buildViewModel(game, res.state);
const safe = safeBuildViewModel(game, res.state);
const valid = validateState(game, res.state);
const code: JsonDeckErrorCode = 'UNKNOWN_CARD';
void vm;
void safe;
void valid;
void code;
void RUNTIME_LIMITS.maxExpressionDepth;
EOF
cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2020",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["consumer.ts"]
}
EOF
npx --yes --package typescript@5.5.4 tsc -p tsconfig.json
echo "    TypeScript ok"

echo "==> Consumer smoke passed"
