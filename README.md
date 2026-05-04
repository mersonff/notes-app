# Notes App — Sistema de Anotações

[![Backend](https://img.shields.io/badge/backend-Rails%208.1-CC0000.svg)](https://rubyonrails.org/)
[![Frontend](https://img.shields.io/badge/frontend-Vue%203.5-42b883.svg)](https://vuejs.org/)
[![PrimeVue](https://img.shields.io/badge/UI-PrimeVue%204-007AD9.svg)](https://primevue.org/)
[![Tests](https://img.shields.io/badge/tests-62%20back%20%2B%2073%20front%20%2B%206%20e2e-success.svg)](#testes)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Aplicação completa de anotações (CRUD) implementada como exercício técnico, com foco em **qualidade do código**, **boas práticas de engenharia** (12-factor, i18n, testes além do happy path, validações em camadas, paginação, Docker) e **criticidade técnica** (riscos identificados, limitações documentadas).

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
│   └── spec/                     # 62 examples (model + request)
├── web/                          # Vue 3 SPA
│   ├── src/
│   │   ├── api/                  # axios client + funções tipadas
│   │   ├── components/           # NoteCard, NotesGrid, NoteFormDialog
│   │   ├── i18n/                 # pt-BR.json, en.json, datetime formats
│   │   ├── stores/notes.ts       # Pinia store (CRUD + page-back)
│   │   ├── types/note.ts         # tipos TS compartilhados
│   │   └── views/NotesView.vue
│   ├── e2e/                      # Playwright (6 specs cobrindo CRUD)
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

### `GET /api/v1/notes/:id`

**Resposta `200 OK`** — mesma envelope `{ "data": { ... } }`.
**Resposta `404 Not Found`** — `{ "error": "Recurso não encontrado." }` (traduzido).

### `PATCH /api/v1/notes/:id`

Update parcial — apenas os campos enviados no body são alterados. Aceita `{ "note": { "content": null } }` para limpar o conteúdo.

**Request**
```json
{ "note": { "title": "Novo título" } }
```

**Resposta `200 OK`** — payload completo da nota atualizada (mesma envelope).
**Resposta `422 Unprocessable Content`** — mesmo formato de erro do POST.
**Resposta `404 Not Found`** — quando `:id` não existe.

### `DELETE /api/v1/notes/:id`

**Resposta `204 No Content`** — deleção bem-sucedida (corpo vazio).
**Resposta `404 Not Found`** — quando `:id` não existe (idempotência HTTP-correta: deletar duas vezes retorna 204 e depois 404, não 204+204).

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

### Backend — RSpec (62 examples)

```bash
cd api
bundle exec rspec
```

Cobre:
- **Modelo** (23): validações de presença/length nos limites (max e max+1), título com whitespace, normalização (strip), conteúdo opcional, `recent_first` scope, integração com i18n, *defense in depth* (NULL na DB, length na DB) com `save!(validate: false)`.
- **Controller** (39): paginação default + custom + cap, `page=0/-1/999` (overflow `:empty_page`), `limit="abc"`, headers RFC-8288, ordenação, validação por campo (pt-BR + en), JSON malformado, `note` ausente, atributos desconhecidos descartados pelo strong-params; **show** (200 + 404 traduzido em ambos locales); **update** (PATCH parcial, content nullable, whitespace stripping, 422 sem mutar estado, 404, 400); **destroy** (204 + idempotência HTTP-correta — 204 na primeira, 404 na segunda).

### Frontend — Vitest (73 examples, ~95% coverage)

```bash
cd web
pnpm test                # rodar uma vez
pnpm test:watch          # modo watch
pnpm test:coverage       # com relatório de cobertura
```

Cobre:
- **API layer** (13): wrap uniforme de erros 4xx/5xx, preservação de `validationErrors` em 422, fallback de mensagem; happy + 404 + 422 para `getNote`/`updateNote`/`deleteNote`.
- **Store Pinia** (17): `fetchPage` populando estado, toggle de loading, captura de erro, reuso de limit; `create`/`update` chamando refresh, populando `validationErrors` em 422, `submitError` em network error/404, limpeza entre tentativas; `destroy` retornando bool, toggle de `deleting`, **page-back automático quando a página atual fica vazia**.
- **NoteCard** (9): título/conteúdo/data, fallbacks para título whitespace e conteúdo null, emit de edit/delete, passthrough de data inválida, `data-note-id` para seleção em e2e.
- **NotesGrid** (12): fetch on-mount condicional, 6 skeleton cards no loading, empty state com CTA, encaminhamento do evento de edit, **fluxo de delete com `useConfirm` mockado** (não chama `destroy` antes de confirmar), Paginator escondido em página única, conversão 0→1 indexed.
- **NoteFormDialog** (15): create vs edit (header + pré-preenchimento), validação client-side, payload normalizado (`content: null` quando vazio), sucesso fecha + emite `saved`, falha de validação server-side mantém o dialog aberto, cancel não chama nada, reseed dos inputs ao reabrir.

### E2E — Playwright (6 specs)

```bash
cd web
pnpm e2e             # headless
pnpm e2e:ui          # modo UI inspetor
```

Spinning up do Rails e Vite via `webServer` config. Locale forçado para `pt-BR`. Cenários cobertos:
- **create** — abre dialog, preenche, salva, vê toast + card aparecer + form resetar.
- **validação** — submit com título vazio mostra erro em pt-BR e *não* envia request; dialog permanece aberto.
- **cancel** — fecha dialog sem persistir; nada aparece no grid.
- **edit** — seed via dialog → ícone de pencil → dialog reabre pré-preenchido → muda título → toast "atualizada" + card mostra novo conteúdo.
- **delete** — seed via dialog → ícone de trash → ConfirmDialog ("Excluir anotação") → aceitar → toast "excluída" + card desaparece.
- **empty state** — `GET /notes` interceptado pra forçar payload vazio independente da DB de dev.

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

### Por que **cards** ao invés de tabela?

Notas são objetos visualmente distintos (Trello, Google Keep, Apple Notes, Notion) — não linhas de planilha. Defaultar pra `DataTable` é terceirizar a decisão de UI pra biblioteca, e foi exatamente isso que a primeira iteração fez. A versão atual usa uma grade CSS responsiva (`repeat(auto-fill, minmax(260px, 1fr))`) com cards dedicados — escala de 1 coluna no mobile a 3+ no desktop sem media queries. O Paginator do PrimeVue (não o do DataTable) cuida da navegação.

### Por que **Dialog modal** pra criar e editar?

Considerei manter o form sempre visível no topo da página (estilo Notion). Optei pelo Dialog porque o usuário típico de notas passa a maior parte do tempo *lendo* — manter o form sempre presente compete por espaço visual com o conteúdo. O botão "+ Nova anotação" é a porta de entrada óbvia, e o mesmo Dialog é reusado em modo de edição (com pré-preenchimento) — uma única superfície de form pra manter, validar e testar.

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
main      ←── develop ←── feature/scaffold-rails-api    # v0.1.0
                       ←── feature/note-model
                       ←── feature/notes-controller
                       ←── feature/scaffold-vue
                       ←── feature/notes-ui
                       ←── feature/e2e
                       ←── feature/docker
                       ←── feature/readme
                       ←── feature/notes-crud           # v0.2.0
                       ←── feature/notes-card-ui
                       ←── feature/readme-v2            (← este)
```

Todos os merges para `develop` foram feitos com `--no-ff` para preservar a linha do feature branch no histórico. Cada commit é coeso e descreve a motivação no corpo (por que, não só o quê). Tags `v0.1.0` (entrega inicial — só create+list em layout tabela) e `v0.2.0` (CRUD completo + redesign em card grid) marcam os cortes de release.

---

## 📜 Licença

[MIT](LICENSE) © Emerson Freitas
