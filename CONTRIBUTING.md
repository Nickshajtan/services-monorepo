# Contributing

## General principles

- One module / service — one directory (`php-core/`, `services/scraper-python/`, `elastic-wp-plugin/`, etc.).
- Contracts (OpenAPI/JSON schema) live in `contracts/`.
- README of each module is in the corresponding folder and is automatically compiled into the root README.

## Commits

- Must begin with meaningful title: `feat:`, `fix:`, `chore:`, `hotfix:`, `test`, `refactor:` or `docs:`.

## Tests

- PHP: `phpunit` / `pest`
- Python: `pytest`
- JS/TS: `vitest` / `jest`
