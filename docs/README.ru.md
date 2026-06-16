# JsonDeck Core — Документация

`@jsondeck/core` — это headless TypeScript runtime для карточных игр, определённых на JSON DSL.

## Обзор

Библиотека предоставляет:

- **Парсер и валидатор DSL** — Парсинг и валидация определений игр в JSON DSL v0.1
- **Управление состоянием игры** — Создание, мутирование и отслеживание состояния
- **Движок правил** — События запускают правила с условиями и командами
- **Разрешение выражений** — Контекстное разрешение переменных и свойств
- **Выполнение команд** — Перемещение карт, создание карт, изменение переменных, таймеры
- **Диспетчеризация событий** — Обработка событий и срабатывание правил
- **Управление таймерами** — Встроенная система таймеров с обработкой по тикам
- **View Models** — Нейтральное к рендерингу представление для любого UI фреймворка

## Архитектура

```
Raw JSON DSL
    ↓
[Validation] → Ошибки/Предупреждения
    ↓
CompiledGame
    ↓
GameState (начальное)
    ↓
[Event Dispatch] ← GameEvent
    ↓
GameState (изменённое)
    ↓
[Tick Processing] ← deltaMs
    ↓
GameState + ViewModel
```

## Основные концепции

### 1. Компиляция

Преобразование raw JSON во внутреннее `CompiledGame`:

```typescript
const game = compileGame(rawJson);
// или
const result = safeCompileGame(rawJson);
if (result.ok) {
  /* ... */
}
```

### 2. Состояние игры

Неизменяемый снимок игры в любой момент:

```typescript
interface GameState {
  gameId: string;
  tick: number; // Сколько прошло тиков
  nowMs: number; // Общее прошедшее время в мс
  vars: Record<string, any>; // Переменные игры
  cards: Record<string, CardInstance>;
  zones: Record<string, ZoneState>;
  timers: Record<string, TimerInstance>;
  meta: GameMeta;
}
```

### 3. События

Запуск правил отправкой событий:

```typescript
const result = dispatchEvent(game, state, {
  type: 'card.clicked',
  source: 'card_id',
  position: { x: 100, y: 200 },
});

state = result.state; // Обновлённое состояние
```

### 4. Правила

Правила реагируют на события с условиями и командами:

```json
{
  "id": "my_rule",
  "on": "card.dropped_on_card",
  "if": { "card.has_tag": ["$source", "interactive"] },
  "then": [{ "start_timer": { "id": "my_timer", "duration_ms": 5000 } }]
}
```

### 5. Таймеры

Отслеживание задержек и срабатываний:

```typescript
const tickResult = tick(game, state, 1000); // Прошло 1 секунда

// Завершение таймера запускает timer.finished события
// Новые таймеры созданные в этом тике обработаны не будут до следующего
```

### 6. View Models

Получение представления нейтрального к способу рендеринга:

```typescript
const vm = buildViewModel(game, state);
// Содержит: зоны, карты, HUD элементы с координатами и стилями
```

## Ключевые особенности

### Иммутабельность

Все функции возвращают новое состояние, никогда не мутируют входное:

```typescript
const result = dispatchEvent(game, state, event);
const newState = result.state;
// Исходное состояние не изменилось
```

### Детерминизм

Одинаковые входные данные → одинаковый результат. Без RNG, без временных меток, без побочных эффектов.

### Типизация

Полная поддержка TypeScript со strict types. Никаких `any`.

### Обработка ошибок

Структурированные ошибки с кодами и путями:

```typescript
interface JsonDeckError {
  code: string; // 'UNKNOWN_CARD', 'SEMANTIC_VALIDATION_ERROR', и т.д.
  message: string;
  path?: string; // Где в DSL или состоянии
}
```

## DSL v0.1

Полная спецификация в [DSL.ru.md](./DSL.ru.md).

Быстрый пример:

```json
{
  "jsondeck": "0.1",
  "id": "game-id",
  "title": "Название игры",
  "table": { "width": 800, "height": 600, "camera": { "mode": "fixed" } },
  "zones": {
    "main": { "type": "free_space", "layout": "free" }
  },
  "cardTypes": {
    "my-card": { "title": "Моя карта", "tags": ["interactive"] }
  },
  "initialState": {
    "cards": [{ "id": "c1", "type": "my-card", "zone": "main" }]
  },
  "rules": [
    {
      "id": "handle-click",
      "on": "card.clicked",
      "then": [{ "flip_card": { "card": "$source", "face": "down" } }]
    }
  ]
}
```

## API справка

Полная документация API в [API.ru.md](./API.ru.md).

Основные экспорты:

```typescript
export { compileGame, safeCompileGame };
export { createInitialState };
export { dispatchEvent };
export { tick };
export { buildViewModel };
export { createRuntime };
```

## Общие паттерны

### Создать Runtime обёртку

```typescript
const runtime = createRuntime(gameJson);
runtime.dispatch(event);
runtime.tick(100);
const vm = runtime.getViewModel();
```

### Безопасная обработка ошибок

```typescript
const result = safeCompileGame(gameJson);
if (!result.ok) {
  console.error('Ошибка компиляции:', result.errors);
} else {
  const game = result.game;
}
```

### Разрешение выражений

Выражения начинающиеся с `$` разрешаются:

```json
{ "card": "$source" }         // → значение 'source' в контексте
{ "counter": "$vars.counter" } // → значение переменной игры
```

## Производительность

- Оптимизация не требуется для малых игр (< 1000 карт, < 100 правил)
- Клонирование состояния O(cards + timers), не O(всё)
- Поиск правил O(rules), условия вычисляются лениво
- Избегайте глубокого вложения в условиях для сложных игр

## Тестирование

Используйте `@jsondeck/core` в тестах вашей игры:

```typescript
import { compileGame, createInitialState, dispatchEvent } from '@jsondeck/core';

describe('моя игра', () => {
  it('должна реагировать на события', () => {
    const game = compileGame(myGameJson);
    const state = createInitialState(game);
    const result = dispatchEvent(game, state, myEvent);
    expect(result.state.cards).toHaveProperty('new_card');
  });
});
```

## Ограничения

- Нет мультиплеера и сетевого взаимодействия (только headless)
- Нет загрузки ассетов (изображения, звуки, шрифты)
- Нет анимаций или визуальных эффектов
- Нет сохранения/загрузки состояния
- Нет учётных записей и аутентификации
- Нет скрытой информации или ролей игроков
- Нет случайных чисел (только детерминизм)

Эти ответственности возлагаются на ваш UI/game фреймворк, а не на core.

## Дальнейшие шаги

1. Прочитайте [DSL.ru.md](./DSL.ru.md) для понимания синтаксиса
2. Изучите [API.ru.md](./API.ru.md) для сигнатур функций
3. Посмотрите [examples/](../examples/) для примеров игр
4. Смотрите [CONTRIBUTING.md](./CONTRIBUTING.md) для участия

## Поддержка

- Issues: [github.com/jsondeck/core/issues](https://github.com/jsondeck/core/issues)
- Discussions: [github.com/jsondeck/core/discussions](https://github.com/jsondeck/core/discussions)
