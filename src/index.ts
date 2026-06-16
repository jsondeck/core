// DSL & Compilation
export { compileGame, safeCompileGame } from './dsl/compileGame.js';
export type { CompileGameResult } from './errors/types.js';
export type {
  GameDefinition,
  CompiledGame,
  CompiledRule,
  CompiledInitialState,
  CompiledInitialCard,
  Rule,
  Condition,
  Command,
  InitialState,
  InitialCard,
  VariableDefinition,
  CardTypeDefinition,
  ZoneDefinition,
  TableDefinition,
  ThemeDefinition,
  HudItemDefinition,
  RuleEventType,
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
export type {
  DispatchResult,
  TickResult,
  Runtime,
  ExecutedCommandRecord,
} from './runtime/types.js';
export type {
  GameViewModel,
  CardViewModel,
  ZoneViewModel,
  HudItemViewModel,
} from './view/types.js';

// Errors
export { JsonDeckCompileError, JsonDeckErrorCodes } from './errors/types.js';
export type { JsonDeckError, JsonDeckWarning, JsonDeckErrorCode } from './errors/types.js';

// Public Types
export type { GameValue } from './dsl/types.js';
