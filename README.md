# Notes App — Sistema de Anotações

[![Backend](https://img.shields.io/badge/backend-Rails%208.1-CC0000.svg)](https://rubyonrails.org/)
[![Frontend](https://img.shields.io/badge/frontend-Vue%203.5-42b883.svg)](https://vuejs.org/)
[![PrimeVue](https://img.shields.io/badge/UI-PrimeVue%204-007AD9.svg)](https://primevue.org/)
[![Tests](https://img.shields.io/badge/tests-46%20back%20%2B%2040%20front%20%2B%203%20e2e-success.svg)](#testes)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Aplicação de anotações simples (criar e listar) implementada como exercício técnico, com foco em **qualidade do código**, **boas práticas de engenharia** (12-factor, i18n, testes além do happy path, validações em camadas, paginação, Docker) e **criticidade técnica** (riscos identificados, limitações documentadas).

---

## 📐 Visão Geral

```
                ┌────────────────────────────────────┐
                │           Browser (SPA)            │
                └──────────────┬─────────────────────┘
                               │  http://localhost:8080
                               ▼
        ┌──────────────────────────────────────────────────┐
        │  web (nginx 1.27)                                │
        │  - serve /dist (Vue SPA)                         │
        │  - reverse-proxy  /api/* → api:80                │
        │  - reverse-proxy  /up    → api:80                │
        └──────────────┬───────────────────────────────────┘
                       │  api:80
                       ▼
        ┌──────────────────────────────────────────────────┐
        │  api (Rails 8.1 API-only + Thruster + Puma)      │
        │  - /api/v1/notes  GET (paginado) + POST          │
        │  - /up            healthcheck                    │
        └──────────────┬───────────────────────────────────┘
                       │  db:5432
                       ▼
                ┌────────────────────┐
                │  db (Postgres 16)  │
                └────────────────────┘
```

Os três serviços rodam isolados em containers, conectados pela rede default do Compose. Todos os segredos e tunables são injetados via variáveis de ambiente — a mesma imagem é executável em qualquer ambiente sem rebuild.

---

## 🧰 Stack

### Backend (`api/`)
- **Ruby** 3.4.9 + **Rails** 8.1.3 (API-only)
- **PostgreSQL** 16 via `pg` adapter
- **Pagy** 9.4 — paginação rápida com headers RFC-8288 + metadata no body
- **rack-cors** 3.0 — origins controlados via env (12-factor)
- **rails-i18n** 8.1 — traduções base pt-BR/en
- **dotenv-rails** 3.2 — carregamento de `.env` em dev/test
- **Thruster** + **Puma** — HTTP front (compressão, X-Sendfile)
- **RSpec** 8 + **FactoryBot** + **Shoulda Matchers** — testes
- **Brakeman** + **bundler-audit** + **Rubocop** (rails-omakase) — segurança e estilo

### Frontend (`web/`)
- **Vue** 3.5 + **TypeScript** 6 + **Vite** 8
- **PrimeVue** 4.5 com tema **Aura** (`@primeuix/themes`)
- **Pinia** 3 — state management
- **vue-i18n** 11 — locale baseada em `navigator.language`, formatos de data por locale
- **axios** 1.16 — HTTP client com interceptor de `Accept-Language`
- **Vitest** 4 + **happy-dom** + **@vue/test-utils** — testes unitários
- **Playwright** 1.59 — testes end-to-end (chromium)
- **ESLint** 10 (flat config) + **Prettier** 3 — lint e formatação

### Infra
- **Docker Compose** com healthchecks em todos os serviços
- Dockerfiles **multi-stage** (build separado do runtime, imagens slim)
- nginx **unprivileged** (1.27-alpine) na frente da SPA

---

## 🚀 Como executar

### Opção A — Docker Compose (recomendado)

Requisitos: Docker 24+ e Docker Compose v2.

```bash
git clone https://github.com/mersonff/notes-app.git
cd notes-app

# Cria o .env a partir do template
cp .env.example .env

# Gera um SECRET_KEY_BASE forte e injeta no .env
docker run --rm ruby:3.4-slim bash -c 'gem install rails -v "~> 8.1" --no-document --silent && rails secret' \
  | xargs -I {} sed -i "s|^SECRET_KEY_BASE=.*|SECRET_KEY_BASE={}|" .env

docker compose up --build
```

Aguarde os healthchecks ficarem verdes e abra **http://localhost:8080**.

A primeira inicialização do banco é automática (o `bin/docker-entrypoint` da imagem do Rails chama `db:prepare` antes do `rails server`).

### Opção B — Desenvolvimento local

Requisitos: **Ruby 3.4.9** (rvm/rbenv), **Node 22+**, **pnpm 10+**, **PostgreSQL 16**.

```bash
# Backend
cd api
cp .env.example .env
bundle install
bundle exec rails db:prepare
bundle exec rails server  # porta 3000

# Frontend (em outro terminal)
cd web
cp .env.example .env.development
pnpm install
pnpm dev  # porta 5173 — proxy /api → localhost:3000
```

Abra **http://localhost:5173**.

---

## 📦 Estrutura

```
notes-app/
├── api/                          # Rails 8.1 API
│   ├── app/
│   │   ├── controllers/api/v1/   # NotesController (versionado)
│   │   ├── controllers/application_controller.rb  # rescue_from + locale
│   │   └── models/note.rb        # validações, normalização, scopes
│   ├── config/
│   │   ├── initializers/cors.rb  # origins via env
│   │   ├── initializers/pagy.rb  # limite + max + overflow + metadata
│   │   ├── locales/pt-BR.yml     # tradução de attribute names
│   │   └── locales/en.yml
│   └── spec/                     # 46 examples (model + request)
├── web/                          # Vue 3 SPA
│   ├── src/
│   │   ├── api/                  # axios client + funções tipadas
│   │   ├── components/           # NoteForm, NotesList
│   │   ├── i18n/                 # pt-BR.json, en.json, datetime formats
│   │   ├── stores/notes.ts       # Pinia store
│   │   ├── types/note.ts         # tipos TS compartilhados
│   │   └── views/NotesView.vue
│   ├── e2e/                      # Playwright (3 specs)
│   ├── nginx.conf                # reverse-proxy /api e /up
│   └── Dockerfile                # multi-stage (node → nginx)
├── docker-compose.yml            # db + api + web
├── .env.example                  # template de variáveis
└── README.md
```

---

## 🔌 Contrato da API

Base path: `/api/v1`

### `GET /api/v1/notes`

Listagem paginada, ordenada por `created_at DESC, id DESC` (mais recentes primeiro).

**Query params**

| Param   | Tipo  | Default | Limite                | Comportamento                          |
|---------|-------|---------|-----------------------|----------------------------------------|
| `page`  | int   | `1`     | `>= 1`                | `<=0` é normalizado para `1`           |
| `limit` | int   | `20`    | `[1, PAGY_MAX_ITEMS]` | inválido/`0`/negativo cai no default; valores acima do max são truncados |

**Resposta `200 OK`**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Reunião",
      "content": "Pauta...",
      "created_at": "2026-05-03T10:00:00Z",
      "updated_at": "2026-05-03T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "pages": 1, "count": 1, "prev": null, "next": null }
}
```

**Headers de resposta** (RFC-8288)
- `link: <…>; rel="first|prev|next|last"`
- `current-page`, `page-items`, `total-pages`, `total-count`

### `POST /api/v1/notes`

**Request**
```json
{ "note": { "title": "Reunião", "content": "Pauta opcional" } }
```

**Resposta `201 Created`** — payload idêntico ao item de `GET`.

**Resposta `422 Unprocessable Content`** — falha de validação:
```json
{
  "errors": {
    "title": ["não pode ficar em branco"]
  }
}
```

**Resposta `400 Bad Request`** — JSON malformado ou param `note` ausente.

### Internacionalização das mensagens

O backend respeita o header `Accept-Language` (apenas a primeira tag é considerada). Mensagens de erro voltam em pt-BR por padrão e em inglês quando `Accept-Language: en`. O frontend mantém o `<html lang>` em sync com vue-i18n e o axios client encaminha automaticamente.

---

## ⚙️ Variáveis de ambiente (12-factor)

Veja `.env.example` na raiz e em `api/` e `web/`. As principais:

### Compose (raiz)

| Variável             | Default                          | Descrição                                        |
|----------------------|----------------------------------|--------------------------------------------------|
| `POSTGRES_USER`      | `postgres`                       | Usuário do Postgres                              |
| `POSTGRES_PASSWORD`  | `postgres`                       | Senha do Postgres                                |
| `POSTGRES_DB`        | `notes_app_production`           | Nome do banco                                    |
| `SECRET_KEY_BASE`    | **obrigatório**                  | Falha fast se ausente; gere com `bin/rails secret` |
| `CORS_ORIGINS`       | `http://localhost:8080`          | Origens permitidas pelo CORS (vírgula-separadas) |
| `PAGY_DEFAULT_ITEMS` | `20`                             | Itens por página default                         |
| `PAGY_MAX_ITEMS`     | `100`                            | Limite máximo solicitável via `?limit=`          |
| `WEB_PORT`           | `8080`                           | Porta do nginx exposta no host                   |
| `RAILS_LOG_LEVEL`    | `info`                           | Verbosidade do log                               |
| `RAILS_ASSUME_SSL`   | `false` (compose) / `true` (prod real) | Toggle de SSL atrás de proxy                |
| `RAILS_FORCE_SSL`    | `false` (compose) / `true` (prod real) | Redirect HTTP→HTTPS                         |

### Frontend (`web/.env`)

| Variável          | Descrição                                                     |
|-------------------|---------------------------------------------------------------|
| `VITE_API_URL`    | Base URL da API. Vazio em produção (nginx faz reverse-proxy). |

---

## 🧪 Testes

### Backend — RSpec (46 examples)

```bash
cd api
bundle exec rspec
```

Cobre:
- **Modelo** (23): validações de presença/length nos limites (max e max+1), título com whitespace, normalização (strip), conteúdo opcional, `recent_first` scope, integração com i18n, *defense in depth* (NULL na DB, length na DB) com `save!(validate: false)`.
- **Controller** (23): paginação default + custom + cap, `page=0/-1/999` (overflow `:empty_page`), `limit="abc"`, headers RFC-8288, ordenação, validação por campo (pt-BR + en), JSON malformado, `note` ausente, atributos desconhecidos descartados pelo strong-params.

### Frontend — Vitest (40 examples, ~95% coverage)

```bash
cd web
pnpm test                # rodar uma vez
pnpm test:watch          # modo watch
pnpm test:coverage       # com relatório de cobertura
```

Cobre:
- **API layer** (8): wrap de erros 4xx/5xx, preservação de `validationErrors` em 422, fallback de mensagem.
- **Store Pinia** (9): `fetchPage` populando estado, toggle de loading, captura de erro, reuso de limit; `create` chamando refresh, populando `validationErrors` em 422, `submitError` em network error, limpeza entre tentativas.
- **NoteForm** (10): placeholders, validação client-side (required + length em tempo real), short-circuit do submit quando inválido, payload com `content: null` quando vazio, reset após sucesso, persistência de inputs em erro server-side, merge de mensagens client + server.
- **NotesList** (7): fetch on-mount somente quando vazio, empty state, render por nota, placeholder de content nulo, error banner traduzido, conversão de evento de page (0-indexed PrimeVue → 1-indexed API).

### E2E — Playwright (3 specs)

```bash
cd web
pnpm e2e             # headless
pnpm e2e:ui          # modo UI inspetor
```

Spinningup do Rails e Vite via `webServer` config. Locale forçado para `pt-BR`. Cenários:
- **happy path** — criar, ver toast traduzido, verificar nota no topo da lista, form resetado.
- **validação** — submit com título vazio mostra mensagem em pt-BR e *não* envia request.
- **empty state** — `GET /notes` interceptado para garantir o cenário regardless of dev DB.

### Lint, formatação e tipos

```bash
# Backend
cd api && bundle exec rubocop && bundle exec brakeman --quiet && bundle exec bundler-audit check

# Frontend
cd web && pnpm lint && pnpm format:check && pnpm type-check
```

---

## 🧠 Decisões técnicas e trade-offs

### Por que Rails API-only + SPA separada?

A separação evidencia a fronteira contratual entre back e front, e permite que o avaliador veja o trabalho dos dois lados de forma independente. Para um teste, perde-se a praticidade de um monolito Rails+Hotwire mas ganha-se em clareza arquitetural.

### Por que PrimeVue + DataTable em modo lazy?

O `DataTable` resolve paginação completa (UI + estado) em poucas linhas, então o foco fica no que de fato é avaliado: contrato, validação, testes. O custo é uma dependência maior (~200KB gzipped). Para um produto real eu reconsideraria — mas o tradeoff é deliberado.

### Por que **Pagy** ao invés de Kaminari?

Pagy é significativamente mais rápido (overhead negligenciável em dataset pequeno mas demonstra escolha consciente), tem extras desacoplados (headers, limit, overflow, metadata) que se compõem bem para uma API JSON, e o response carrega tanto headers RFC-8288 quanto metadata no body — clientes HTTP-first e SPAs ficam ambos felizes.

### Por que **Pinia vanilla** e não Pinia Colada?

Considerei Pinia Colada (TanStack-Query-equivalent para Vue) e descartei: a aplicação tem 1 query e 1 mutation, então o ganho de cache/invalidation não compensa a dependência ainda em 0.x. Pinia vanilla é mais "boring tech" e demonstra domínio do core sem adornos.

### Por que normalizar paginação inválida ao invés de retornar 400?

`page=0` ou `?limit=abc` provavelmente vêm de um cliente confuso, não de um ataque. Tratar como "page 1, limit default" é mais hospitaleiro para SPAs e equivale ao que sites maduros (GitHub, Stripe) fazem. **Limites absurdos** (`?limit=99999999`) são *truncados* ao máximo configurado — defesa contra DoS sem fricção para o usuário.

### Por que `before_validation :normalize_title` e não um custom validator?

`presence: true` já rejeita strings só com whitespace (Rails considera `"   ".blank? == true`). O `strip` antes da validação evita persistir títulos com padding cosmético sem precisar de um validador adicional. Mais simples = menos para manter.

### Por que i18n no back **e** no front?

Mensagens de validação são autoritativas no servidor (única fonte de verdade), mas a UX precisa ser instantânea. O frontend tem suas próprias mensagens client-side (idênticas em conteúdo) que aparecem antes do servidor responder; quando o servidor responde, suas mensagens são *adicionais* às do client (não substituem). O `Accept-Language` é encaminhado para que o servidor escolha a língua certa.

### Por que **Thruster + Puma** no backend?

Configuração default do Rails 8 — Thruster lida com X-Accel-Redirect, compressão e cache HTTP, deixando Puma focado em servir. Para um API-only é leve e ergonômico.

### Por que **nginx unprivileged**?

Imagem oficial que roda como usuário `nginx` (UID 1001) ao invés de root, listening em 8080. Reduz superfície de ataque sem perder nenhuma funcionalidade.

---

## ⚠️ Limitações conhecidas / fora do escopo

Decisões de escopo deliberadas, não esquecimentos:

| Item                                        | Status        | Justificativa                                                                                              |
|---------------------------------------------|---------------|------------------------------------------------------------------------------------------------------------|
| Autenticação / multi-usuário                | **Fora**      | Spec original não pede. Adicionar JWT/cookies complicaria o foco do teste.                                 |
| Editar/deletar nota                         | **Fora**      | Spec só pede *criar e listar*. Caminhos para `update`/`destroy` ficam óbvios mas não foram implementados.   |
| Rate limiting                               | **Fora**      | Em produção real eu adicionaria `rack-attack`. Para o teste, fora do escopo.                                |
| Soft delete / auditoria                     | **Fora**      | Requeriria `paper_trail` ou similar. Fora do escopo.                                                        |
| Pesquisa / filtros / ordenação por usuário  | **Fora**      | Não pedido. Front simples por design.                                                                       |
| HTTPS / certificados                        | **Em prod real** | Compose local roda em HTTP; `RAILS_FORCE_SSL` é toggleável e default `true` para deploys reais.          |
| Pré-warm de cache / CDN                     | **Fora**      | Trade-off de complexidade vs valor para um teste.                                                           |
| `master.key` / credenciais criptografadas   | **Substituído** | Tudo via env (`SECRET_KEY_BASE` etc.) — `config.require_master_key = false`. Simplifica deployment.       |

### Riscos identificados

1. **Banco do dev sendo poluído pelos e2e** — os testes Playwright usam a DB de desenvolvimento. Tornei o teste robusto a dados acumulados (timestamps únicos), mas em CI eu spinaria uma DB efêmera específica.
2. **Sem invalidação de cache cliente após criação** — o store recarrega a página atual após criar (`fetchPage`). Para UX instantânea com volume alto, optaria por inserção otimista local. Não fiz porque mantém a *fonte da verdade no servidor*.
3. **Rubocop é o `rails-omakase`** — opinião do DHH, nem todo time concorda. Para um time real eu negociaria estilo antes de fixar.
4. **PrimeVue traz peso** — bundle 891KB / 216KB gzipped. Para uma página de notas é excessivo; em um produto real avaliaria headless UI ou CSS puro.

---

## 🌿 Histórico — Gitflow

Branches do desenvolvimento:

```
main      ←── develop ←── feature/scaffold-rails-api
                       ←── feature/note-model
                       ←── feature/notes-controller
                       ←── feature/scaffold-vue
                       ←── feature/notes-ui
                       ←── feature/e2e
                       ←── feature/docker
                       ←── feature/readme  (← este)
```

Todos os merges para `develop` foram feitos com `--no-ff` para preservar a linha do feature branch no histórico. Cada commit é coeso e descreve a motivação no corpo (por que, não só o quê).

---

## 📜 Licença

[MIT](LICENSE) © Emerson Freitas
