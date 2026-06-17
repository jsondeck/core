# API справка

Полное описание всех публичных функций и типов.

## Основные функции

- `compileGame(raw)` — Компилирует JSON в CompiledGame или выбросит ошибку
- `safeCompileGame(raw)` — Безопасный вариант, возвращает результат
- `createInitialState(game)` — Создаёт начальное состояние
- `dispatchEvent(game, state, event)` — Обрабатывает событие
- `tick(game, state, deltaMs)` — Продвигает время
- `buildViewModel(game, state)` — Строит view model
- `createRuntime(raw)` — Создаёт удобную обёртку

Полная документация на английском в [API.en.md](./API.en.md).

## Типы

Основные типы экспортируются из пакета:

```typescript
import {
  CompiledGame,
  GameState,
  GameEvent,
  GameViewModel,
  JsonDeckError,
  JsonDeckCompileError,
  DispatchResult,
  TickResult,
  Runtime,
} from '@jsondeck/core';
```

## Ошибки

Все ошибки содержат:

- `code` — Строка кода ошибки
- `message` — Человекочитаемое описание
- `path` — Путь в DSL или состояние
- `details` — Дополнительный контекст

Коды включают: `UNKNOWN_CARD`, `UNKNOWN_ZONE`, `INVALID_EVENT`, и другие.

## Гарантии

- **Иммутабельность** — Входные аргументы не мутируются
- **Детерминизм** — Одинаковые входные данные дают одинаковые результаты
- **Типизация** — Полная поддержка TypeScript strict mode

Для полных деталей см. [API.en.md](./API.en.md).
