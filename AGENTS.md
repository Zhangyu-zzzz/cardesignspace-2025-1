# Repository Guidelines

## Project Structure & Module Organization
- Core packages: `frontend/` (Vue 2 SPA with `src/components`, `views`, `store`) and `backend/` (Express API in `src/`, migrations and DB scripts in `migrations/` and `scripts/`).
- Architecture notes live in `docs/` plus focused guides such as `docs/features/context-menu-right-click.md`; review them before touching shared flows.
- E2E automation sits in `tests/e2e` with repo-level `playwright.config.ts`; test artifacts default to `test-results/`.

## Build, Test, and Development Commands
- Install once per package: `cd frontend && npm install`, `cd backend && npm install`.
- Frontend: `npm run serve` (localhost:8080 with API proxy) and `npm run build` for production assets.
- Backend: `npm run dev` for nodemon reloads, `npm start` for production, `npm run db:sync` to align Sequelize models.
- E2E: execute `npx playwright test`; fetch browsers beforehand with `npm run playwright:install`.

## Coding Style & Naming Conventions
- Keep two-space indentation across JS/TS/Vue; match existing trailing comma and quote usage.
- Vue SFCs stay `PascalCase` (e.g., `ImageGallery.vue`); shared utilities remain camelCase.
- Backend services use camelCase while Sequelize models expose snake_case columns; document schema shifts in `docs/`.
- Run `cd frontend && npm run lint` before committing UI work; manually enforce consistent logging and guard clauses server-side.

## Testing Guidelines
- Create Playwright specs under `tests/e2e` as `*.spec.ts`, grouping related checks with `test.describe`.
- Use `test.skip` for flaky/destructive cases and leave inline TODO context for re-enabling.
- Purge temporary screenshots/video from `test-results/` prior to pushing so CI remains deterministic.
- Capture manual validation steps in the relevant doc under `docs/features` or `docs/fixes` (e.g., `docs/IMAGE_TAGGING_GUIDE.md`).

## Commit & Pull Request Guidelines
- Follow the `type: summary` pattern in history (`fix: remove exposed token`), keeping the first line imperative and under ~72 characters.
- Expand on intent in the body with concise paragraphs or bullet lists; bilingual detail is welcome if the lead line stays sharp.
- Pull requests should link issues, outline deployment impact, list verification commands, and include UI captures or API samples when applicable.
- CI on `main` and `develop` deploys via SSH; avoid force-pushing over red pipelines—surface blockers or coordinate with ops.

## Security & Configuration Tips
- Copy `env.example` to `.env` for local runs and never commit secrets; CI injects production values.
- Mirror anti-crawler or rate-limit changes in `docs/operations/anti-crawler-guide.md` and alert ops before toggling middleware.
- Docker deploy scripts assume assets under `/opt/auto-gallery`; align path updates with infrastructure owners.
