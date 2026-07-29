# Pecus

Sistema de controle de agropecuária (gestão de lotes de gado, ganho de peso, gastos por período de produção e métodos de manejo como TIP).

Monorepo com:

- **apps/web** — Next.js (frontend + backend): telas em `src/app/(app)`, API em
  Route Handlers sob `src/app/api/**`, lógica de servidor em `src/server/**`,
  Prisma (PostgreSQL) em `prisma/`.
- **apps/mobile** — React Native (entra depois)
- **packages/shared** — Tipos, DTOs e enums compartilhados

## Pré-requisitos

- Node.js >= 20
- PostgreSQL rodando localmente (ou via Docker), ou um projeto Supabase
- npm (usa npm workspaces)

## Setup rápido (localhost)

```bash
# 1. Instalar dependências de todo o monorepo
npm install

# 2. Subir um Postgres local com Docker (opcional, se não tiver um)
docker compose up -d

# 3. Configurar variáveis de ambiente
cp apps/web/.env.example apps/web/.env
# edite apps/web/.env com a sua DATABASE_URL, DIRECT_URL e JWT_SECRET

# 4. Rodar as migrations do Prisma
npm run prisma:migrate

# 5. Rodar o app (frontend + API, porta 3000)
npm run web:dev
```

## Estrutura de papéis (RBAC)

- **ADMIN** — controle total de todas as empresas (suporte do sistema).
- **RESPONSAVEL** — admin da própria fazenda: cria usuários, define permissões, mas só enxerga a(s) empresa(s) dele.
- **USUARIO** — acesso apenas ao que o responsável liberar (permissões granulares por módulo).

## Ordem de desenvolvimento (MVP)

1. Autenticação + cadastro de empresa + convite de usuários
2. Cadastro de lotes + método de manejo
3. Lançamento de pesagens (ganho de peso)
4. Lançamento de gastos por categoria
5. Dashboard/relatórios (custo por arroba, GMD, etc.)



Aplicação com foco em controle e cuidados sobre os lotes de gado, ganho de peso, gastos por período de produção, envolvendo vários processos de manejo (utilizando TIP como exemplo)