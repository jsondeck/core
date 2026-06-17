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

Текущая версия: **0.1.1** (beta)

## Критерии релиза

Версия выпускается только если на `main` выполнено всё:

1. `npm run check` зелёный (format, lint без warnings, typecheck по `src` и `test`,
   тесты, build).
2. Внешний fixture-набор проходит (`test/externalRuntimeFixtures.test.ts`, 19/19).
3. `npm pack --dry-run` даёт чистый тарбол (без sourcemap; только `dist`,
   `examples`, README, LICENSE, CHANGELOG).
4. Проходит browser-bundle smoke (сборка для `platform=browser` без node-only API).
5. `npm audit --omit=dev` — 0 уязвимостей в runtime-зависимостях.
6. На каждое пользовательское изменение есть Changeset, CHANGELOG обновлён.

**Контракт стабильности `0.x`:** до `1.0.0` DSL и публичный API могут меняться
между **minor**-версиями (отражается в CHANGELOG); patch не меняет DSL/API.
Потребителям рекомендуется фиксировать точную версию. Полные критерии — в
[английской версии](./RELEASES.en.md#release-criteria).

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

## Данные для публикации

Штатный release использует npm Trusted Publishing через GitHub Actions OIDC, а
не долгоживущий publish-токен.

Владелец должен настроить пакет на npmjs.com:

- Package: `@jsondeck/core`
- Trusted publisher: GitHub Actions
- Organization/repository: `jsondeck` / `core`
- Workflow filename: `release.yml`
- Allowed action: `npm publish`

Workflow должен сохранять `id-token: write`, использовать Node `>=22.14.0` и npm
CLI `>=11.5.1`. В репозитории используется Node 24 и npm 11.

`NPM_TOKEN` допустим только как аварийный fallback. Если токен применялся для
локальной/token-публикации, его нужно сразу ротировать.

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
