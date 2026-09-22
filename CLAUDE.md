# Ирина против комаров

Браузерная роглайт-аркада на Canvas 2D, ванильный JS (ES-модули), без сборки и внешних
ассетов. Хостинг — GitHub Pages из ветки `main`, корень репозитория.

- Дизайн: `docs/superpowers/specs/2026-09-22-irina-vs-komaru-design.md` — источник истины
  по механикам и балансу. Меняешь баланс — правь `src/game/config.js` и spec вместе.
- Чистая логика (`src/game/*`, `src/core/rng.js`, `src/core/storage.js`) не трогает DOM
  и покрывается тестами `node --test tests/`. Рендер (`src/render/*`) и звук
  (`src/core/audio.js`) — тонкие слои без логики.
- Проверки: `npm test`, `npm run check`. Хуки: `git config core.hooksPath .githooks`.
- Локальный запуск: `npm run serve` → `http://localhost:8123/` (curl с `--noproxy '*'`).
- Задачи — Agent Board (GitHub Projects), репозиторий `allgrit/irina-vs-komaru`.
