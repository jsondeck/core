import { CompiledGame } from '../dsl/types.js';
import { GameState } from '../model/types.js';
import { GameViewModel, ZoneViewModel, CardViewModel } from './types.js';
import { resolveValue, ResolveContext } from '../expressions/resolveValue.js';

const DEFAULT_CARD_WIDTH = 120;
const DEFAULT_CARD_HEIGHT = 170;

export function buildViewModel(game: CompiledGame, state: GameState): GameViewModel {
  const cardTheme = game.theme?.card || {};
  const zoneTheme = game.theme?.zone || {};

  const cardWidth = cardTheme.width ?? DEFAULT_CARD_WIDTH;
  const cardHeight = cardTheme.height ?? DEFAULT_CARD_HEIGHT;

  // Build zones
  const zones: ZoneViewModel[] = [];
  for (const [zoneId, zoneDef] of Object.entries(game.zones)) {
    const zoneState = state.zones[zoneId];
    const rect = zoneDef.rect || { x: 0, y: 0, w: 0, h: 0 };

    const zoneVm: ZoneViewModel = {
      id: zoneId,
      title: zoneDef.title,
      type: zoneDef.type,
      layout: zoneDef.layout,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      cardIds: [...zoneState.cardIds],
      style: {
        border: zoneTheme.border,
        background: zoneTheme.background,
      },
    };

    zones.push(zoneVm);
  }

  // Build cards with layout
  const cards: CardViewModel[] = [];
  for (const [zoneId, zoneDef] of Object.entries(game.zones)) {
    const zoneState = state.zones[zoneId];
    const rect = zoneDef.rect || { x: 0, y: 0, w: 1000, h: 1000 };
    const layout = zoneDef.layout;

    for (let idx = 0; idx < zoneState.cardIds.length; idx++) {
      const cardId = zoneState.cardIds[idx];
      const card = state.cards[cardId];
      if (!card) continue;

      const cardType = game.cardTypes[card.type];

      let x = card.x ?? 0;
      let y = card.y ?? 0;
      let z = card.z ?? idx;

      // Apply layout logic
      if (layout === 'pile') {
        x = rect.x + idx * 3;
        y = rect.y + idx * 3;
        z = idx;
      } else if (layout === 'row') {
        const gap = 8;
        x = rect.x + idx * (cardWidth + gap);
        y = rect.y;
        z = idx;
      } else if (layout === 'grid') {
        const gap = 8;
        const colCount = Math.max(1, Math.floor(rect.w / (cardWidth + gap)));
        const col = idx % colCount;
        const row = Math.floor(idx / colCount);
        x = rect.x + col * (cardWidth + gap);
        y = rect.y + row * (cardHeight + gap);
        z = idx;
      }
      // 'free' layout uses card's own x/y

      const cardVm: CardViewModel = {
        id: cardId,
        type: card.type,
        title: cardType.title,
        description: cardType.description,
        art: cardType.art,
        x,
        y,
        z,
        width: cardWidth,
        height: cardHeight,
        face: card.face,
        tags: [...card.tags],
        props: { ...card.props },
        style: {
          borderRadius: cardTheme.borderRadius,
          background: cardTheme.background,
          textColor: cardTheme.textColor,
        },
      };

      cards.push(cardVm);
    }
  }

  // Build HUD
  const hud = game.hud.map((item) => {
    const context: ResolveContext = {
      vars: state.vars,
    };
    const { value } = resolveValue(item.value, context);

    return {
      id: item.id,
      label: item.label,
      value,
    };
  });

  return {
    table: {
      width: game.table.width,
      height: game.table.height,
      background: game.table.background,
    },
    zones,
    cards,
    hud,
  };
}
