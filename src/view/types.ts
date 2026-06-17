import { GameValue } from '../dsl/types.js';

export interface ZoneViewModel {
  id: string;
  title?: string;
  type: string;
  layout: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cardIds: string[];
  style: {
    border?: string;
    background?: string;
  };
}

export interface CardViewModel {
  id: string;
  type: string;
  title: string;
  description?: string;
  art?: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  face: 'up' | 'down';
  tags: string[];
  props: Record<string, GameValue>;
  style: {
    borderRadius?: number;
    background?: string;
    textColor?: string;
  };
}

export interface HudItemViewModel {
  id: string;
  label: string;
  value: unknown;
}

export interface GameViewModel {
  table: {
    width: number;
    height: number;
    background?: string;
  };
  zones: ZoneViewModel[];
  cards: CardViewModel[];
  hud: HudItemViewModel[];
}
