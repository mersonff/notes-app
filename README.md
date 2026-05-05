# Notes App

Aplicação de anotações com CRUD completo. Rails 8.1 API + Vue 3 SPA.

## Como rodar

Requisitos: Docker 24+ e Docker Compose v2.

```bash
git clone https://github.com/mersonff/notes-app.git
cd notes-app
cp .env.example .env

docker run --rm ruby:3.4-slim bash -c 'gem install rails -v "~> 8.1" --no-document --silent && rails secret' \
  | xargs -I {} sed -i "s|^SECRET_KEY_BASE=.*|SECRET_KEY_BASE={}|" .env

docker compose up --build
```

Aguarde os healthchecks ficarem verdes e abra **http://localhost:8080**.

A documentação interativa da API está em **http://localhost:8080/api-docs**.

### Modo desenvolvimento (hot-reload)

```bash
docker compose -f docker-compose.dev.yml up
```

- Front: http://localhost:5173
- API:   http://localhost:3000
- Docs:  http://localhost:5173/api-docs

Edições em `api/` ou `web/` refletem ao vivo.

## Stack

**Backend** — Ruby 3.4.9, Rails 8.1, PostgreSQL 16, Pagy (paginação), rswag (OpenAPI), rack-cors, rails-i18n.

**Frontend** — Vue 3.5, TypeScript, Vite 8, PrimeVue 4 (tema Aura), Pinia 3, vue-i18n, axios.

**Infra** — Docker Compose multi-stage, nginx unprivileged.

## Testes

```bash
# Backend (RSpec — 54 examples)
cd api && bundle exec rspec

# Frontend (Vitest — 73 examples)
cd web && pnpm test

# E2E (Playwright — 6 specs)
cd web && pnpm e2e
```

Lint e tipos:

```bash
cd api && bundle exec rubocop && bundle exec brakeman --quiet && bundle exec bundler-audit check
cd web && pnpm lint && pnpm format:check && pnpm type-check
```

## API

Base path `/api/v1`. Documentação completa interativa em `/api-docs` (Swagger UI alimentado pelo `swagger.yaml` gerado a partir das specs RSpec).

| Método | Endpoint            | Descrição                              |
|--------|---------------------|----------------------------------------|
| GET    | `/api/v1/notes`     | Lista paginada (filtros: `page`, `limit`, `search`) |
| POST   | `/api/v1/notes`     | Cria nota                              |
| GET    | `/api/v1/notes/:id` | Mostra nota                            |
| PATCH  | `/api/v1/notes/:id` | Atualiza nota                          |
| DELETE | `/api/v1/notes/:id` | Remove nota                            |

Mensagens de erro respeitam `Accept-Language` (pt-BR padrão, en suportado).

## Variáveis de ambiente

Veja `.env.example`. As principais já têm defaults sensatos. Apenas `SECRET_KEY_BASE` é obrigatória.

## Licença

[MIT](LICENSE) © Emerson Freitas
