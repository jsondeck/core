# Жизненный цикл релизов

Как управляются версии и релизы `@jsondeck/core`.

## Версионирование

Используется [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR** — Breaking changes в DSL или runtime
- **MINOR** — Новые обратносовместимые возможности
- **PATCH** — Исправления ошибок

Текущая версия: **0.1.0** (beta)

## Процесс релиза

Автоматизирован через [Changesets](https://github.com/changesets/changesets).

### Шаги

1. **Создать changeset** на ветке фичи:

   ```bash
   npx changeset add
   ```

2. **Мержить в main** — Файл changeset коммитится

3. **GitHub Actions** обнаруживает changeset:
   - Создаёт Release PR с версией + CHANGELOG
   - Выводит все изменения на review

4. **Мержить Release PR** → Автоматический publish:
   - npm publish
   - GitHub Release
   - CHANGELOG обновляется

### Формат Changeset

При `npx changeset add` ответьте на вопросы:

1. Какие пакеты изменились? (выберите: @jsondeck/core)
2. Тип? (patch, minor, major)
3. Описание (будет в CHANGELOG)

## Необходимые secrets

Владелец репозитория должен добавить:

- **NPM_TOKEN** — токен для публикации в npm

Settings → Secrets and variables → Actions.

## Статус

Текущее состояние: **BETA (0.1.x)**

- DSL может измениться до 1.0
- Runtime API стабилен
- Гарантий формата данных нет

Версия 1.0.0 означает:

- DSL v0.1 финализирована
- API заморожен
- Production ready

## CHANGELOG

В [CHANGELOG.md](../CHANGELOG.md) по [Keep a Changelog](https://keepachangelog.com/).

## Дальше

- [CONTRIBUTING.md](./CONTRIBUTING.md) — Процесс разработки
- [RELEASES.en.md](./RELEASES.en.md) — Полная документация
