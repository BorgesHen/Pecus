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

## Deploy no Vercel

O app inteiro (frontend + API) é um único projeto Next.js em `apps/web`, então
o deploy é direto — sem precisar de um segundo serviço pra API.

1. **Import do repositório**: em vercel.com, "Add New... → Project", conecte a
   conta do GitHub e selecione este repositório.
2. **Root Directory**: nas configurações do projeto (aparece na tela de
   import), defina como `apps/web`. Como o repositório usa npm workspaces
   (`workspaces` no `package.json` da raiz + `package-lock.json` na raiz), a
   Vercel detecta o monorepo automaticamente e roda o `npm install` a partir
   da raiz do repo (resolvendo o link do `packages/shared`), e o build a
   partir de `apps/web` — não precisa de `vercel.json`.
3. **Environment Variables** (Project Settings → Environment Variables,
   marcadas para Production e Preview): copie as mesmas chaves de
   `apps/web/.env.example`:
   - `DATABASE_URL` — pooler do Supabase em modo **Session** (porta 5432, sem
     `?pgbouncer=true`). O modo Transaction (porta 6543) não suporta as
     transações interativas que o app usa.
   - `DIRECT_URL` — connection string direta do Supabase (porta 5432 do host
     do banco), usada só pelas migrations.
   - `JWT_SECRET` — string aleatória longa.
   - `JWT_EXPIRES_IN` — ex: `7d`.
4. **Deploy**. O framework (Next.js) é detectado automaticamente; o
   `postinstall` (`prisma generate`) roda sozinho durante o install.
5. **Migrations**: a Vercel só builda e serve o app, não roda `prisma migrate
   deploy` sozinha. Depois de mudar o schema, rode a migration apontando pro
   Supabase a partir da sua máquina (`npm run prisma:migrate`) antes ou depois
   do deploy — o schema já validado localmente é o que a Vercel vai consumir
   em runtime.

Validado localmente simulando o ambiente da Vercel (install limpo, sem
`packages/shared/dist` pré-buildado nem cache do Next) — o build e o
typecheck passam sem precisar de nenhum passo extra de build para o
`packages/shared` (a Vercel também não vai precisar disso).

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