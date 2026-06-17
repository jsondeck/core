import { GameValue } from '../dsl/types.js';

export interface CardInstance {
  id: string;
  type: string;
  zone: string;
  x?: number;
  y?: number;
  z?: number;
  face: 'up' | 'down';
  props: Record<string, GameValue>;
  tags: string[];
  parent?: string;
  children?: string[];
}

export interface ZoneState {
  id: string;
  cardIds: string[];
}

export interface TimerInstance {
  runtimeId: string;
  seq: number;
  id: string;
  durationMs: number;
  remainingMs: number;
  bind: Record<string, unknown>;
}

export interface GameMeta {
  nextCardSeq: number;
  nextTimerSeq: number;
}

export interface GameState {
  gameId: string;
  tick: number;
  nowMs: number;
  vars: Record<string, GameValue>;
  cards: Record<string, CardInstance>;
  zones: Record<string, ZoneState>;
  timers: Record<string, TimerInstance>;
  meta: GameMeta;
}

export interface TimerSnapshot {
  runtimeId: string;
  id: string;
  durationMs: number;
  bind: Record<string, unknown>;
}

export type GameEvent =
  | GameStartedEvent
  | CardClickedEvent
  | CardDragStartedEvent
  | CardDroppedOnCardEvent
  | CardDroppedOnZoneEvent
  | CardDroppedOnEmptyEvent
  | TimerFinishedEvent
  | CustomGameEvent;

export interface GameStartedEvent {
  type: 'game.started';
}

export interface CardClickedEvent {
  type: 'card.clicked';
  source: string;
  position?: { x: number; y: number };
}

export interface CardDragStartedEvent {
  type: 'card.drag_started';
  source: string;
  position?: { x: number; y: number };
}

export interface CardDroppedOnCardEvent {
  type: 'card.dropped_on_card';
  source: string;
  target: string;
  position: { x: number; y: number };
}

export interface CardDroppedOnZoneEvent {
  type: 'card.dropped_on_zone';
  source: string;
  targetZone: string;
  position: { x: number; y: number };
}

export interface CardDroppedOnEmptyEvent {
  type: 'card.dropped_on_empty';
  source: string;
  zone?: string;
  position: { x: number; y: number };
}

export interface TimerFinishedEvent {
  type: 'timer.finished';
  timerRuntimeId: string;
  timer: TimerSnapshot;
}

export interface CustomGameEvent {
  type: `custom.${string}`;
  payload?: Record<string, unknown>;
}
