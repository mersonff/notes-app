# Notes App

Aplicação de anotações com CRUD completo. Rails 8.1 API + Vue 3 SPA.

## Como rodar

Requisitos: Docker 24+ e Docker Compose v2.

```bash
git clone https://github.com/mersonff/notes-app.git
cd notes-app
docker compose up --build
```

Abra **http://localhost:5173** (a primeira subida instala gems e deps de node, ~2 min).

- Front: http://localhost:5173
- API:   http://localhost:3000
- Docs:  http://localhost:5173/api-docs (Swagger UI)

Edições em `api/` ou `web/` refletem ao vivo (hot-reload via bind mount).

## Stack

**Backend** — Ruby 3.4.9, Rails 8.1, PostgreSQL 16, Pagy (paginação), rswag (OpenAPI), rack-cors, rails-i18n.

**Frontend** — Vue 3.5, TypeScript, Vite 8, PrimeVue 4 (tema Aura), Pinia 3, vue-i18n, axios.

## Testes

```bash
cd api && bundle exec rspec     # RSpec
cd web && pnpm test             # Vitest
cd web && pnpm e2e              # Playwright
```

Lint e tipos:

```bash
cd api && bundle exec rubocop && bundle exec brakeman --quiet && bundle exec bundler-audit check
cd web && pnpm lint && pnpm format:check && pnpm type-check
```

## API

Base path `/api/v1`. Documentação completa interativa em `/api-docs`.

| Método | Endpoint            | Descrição                              |
|--------|---------------------|----------------------------------------|
| GET    | `/api/v1/notes`     | Lista paginada (filtros: `page`, `limit`, `search`) |
| POST   | `/api/v1/notes`     | Cria nota                              |
| GET    | `/api/v1/notes/:id` | Mostra nota                            |
| PATCH  | `/api/v1/notes/:id` | Atualiza nota                          |
| DELETE | `/api/v1/notes/:id` | Remove nota                            |

Mensagens de erro respeitam `Accept-Language` (pt-BR padrão, en suportado).

## Licença

[MIT](LICENSE) © Emerson Freitas
