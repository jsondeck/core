export type GameValue = string | number | boolean;

export interface TableDefinition {
  width: number;
  height: number;
  background?: string;
  camera: { mode: 'fixed' };
}

export interface VariableDefinition {
  type: 'number' | 'string' | 'boolean';
  initial: number | string | boolean;
}

export interface CardTypeDefinition {
  title: string;
  description?: string;
  art?: string;
  tags?: string[];
  props?: Record<string, GameValue>;
}

export interface ZoneDefinition {
  title?: string;
  type: 'free_space' | 'deck' | 'hand' | 'discard' | 'table' | 'slot';
  layout: 'free' | 'pile' | 'row' | 'grid';
  rect?: { x: number; y: number; w: number; h: number };
}

export interface InitialCard {
  id: string;
  type: string;
  zone: string;
  x?: number;
  y?: number;
  z?: number;
  face?: 'up' | 'down';
}

export interface InitialState {
  cards: InitialCard[];
}

export type RuleEventType = string;

export interface HudItemDefinition {
  id: string;
  label: string;
  value: string;
}

export interface ThemeDefinition {
  card?: {
    width?: number;
    height?: number;
    borderRadius?: number;
    background?: string;
    textColor?: string;
  };
  zone?: {
    border?: string;
    background?: string;
  };
  font?: {
    family?: string;
    size?: number;
  };
}

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { eq: unknown[] }
  | { gt: unknown[] }
  | { gte: unknown[] }
  | { lt: unknown[] }
  | { lte: unknown[] }
  | { 'card.is': unknown[] }
  | { 'card.has_tag': unknown[] }
  | { 'card.in_zone': unknown[] }
  | { 'zone.is_empty': unknown };

export type Command =
  | { move_card: { card: unknown; to_zone: unknown; x?: unknown; y?: unknown } }
  | { create_card: { type: unknown; zone: unknown; count: unknown; near?: unknown } }
  | { destroy_card: { card: unknown } }
  | { set_var: { name: string; value: unknown } }
  | { modify_var: { name: string; add: unknown } }
  | { flip_card: { card: unknown; face: 'up' | 'down' } }
  | { start_timer: { id: string; duration_ms: unknown; bind?: Record<string, unknown> } }
  | { emit_event: { type: string; payload?: Record<string, unknown> } };

export interface Rule {
  id: string;
  on: RuleEventType;
  if?: Condition;
  then: Command[];
}

export interface GameDefinition {
  jsondeck: string;
  id: string;
  title: string;
  description?: string;
  table: TableDefinition;
  variables?: Record<string, VariableDefinition>;
  zones: Record<string, ZoneDefinition>;
  cardTypes: Record<string, CardTypeDefinition>;
  initialState: InitialState;
  rules: Rule[];
  hud?: HudItemDefinition[];
  theme?: ThemeDefinition;
}

export interface CompiledInitialCard {
  id: string;
  type: string;
  zone: string;
  x?: number;
  y?: number;
  z?: number;
  face: 'up' | 'down';
}

export interface CompiledInitialState {
  cards: CompiledInitialCard[];
}

export interface CompiledRule {
  id: string;
  on: RuleEventType;
  if?: Condition;
  then: Command[];
}

export interface CompiledGame {
  id: string;
  title: string;
  description?: string;
  table: TableDefinition;
  variables: Record<string, VariableDefinition>;
  cardTypes: Record<string, CardTypeDefinition>;
  zones: Record<string, ZoneDefinition>;
  initialState: CompiledInitialState;
  rules: CompiledRule[];
  hud: HudItemDefinition[];
  theme: ThemeDefinition;
}
