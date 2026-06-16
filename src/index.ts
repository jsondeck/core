// DSL & Compilation
export { compileGame, safeCompileGame } from './dsl/compileGame.js';
export type { CompileGameResult } from './errors/types.js';
export type {
  GameDefinition,
  CompiledGame,
  CompiledRule,
  Condition,
  Command,
  VariableDefinition,
  CardTypeDefinition,
  ZoneDefinition,
  TableDefinition,
  ThemeDefinition,
  HudItemDefinition,
} from './dsl/types.js';

// Model & Runtime
export { createInitialState } from './runtime/createInitialState.js';
export { dispatchEvent } from './rules/dispatchEvent.js';
export { tick } from './runtime/tick.js';
export { buildViewModel } from './view/buildViewModel.js';
export { createRuntime } from './runtime/createRuntime.js';

// Types
export type { GameState, CardInstance, ZoneState, TimerInstance, GameMeta } from './model/types.js';
export type {
  GameEvent,
  GameStartedEvent,
  CardClickedEvent,
  CardDragStartedEvent,
  CardDroppedOnCardEvent,
  CardDroppedOnZoneEvent,
  CardDroppedOnEmptyEvent,
  TimerFinishedEvent,
  CustomGameEvent,
  TimerSnapshot,
} from './model/types.js';
export type { DispatchResult, TickResult, Runtime } from './runtime/types.js';
export type {
  GameViewModel,
  CardViewModel,
  ZoneViewModel,
  HudItemViewModel,
} from './view/types.js';

// Errors
export { JsonDeckCompileError } from './errors/types.js';
export type { JsonDeckError, JsonDeckWarning } from './errors/types.js';

// Public Types
export type { GameValue } from './dsl/types.js';
