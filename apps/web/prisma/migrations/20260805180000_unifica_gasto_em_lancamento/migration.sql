-- Gastos e Financeiro deixam de ser dois sistemas paralelos.
--
-- O PROBLEMA
-- `Gasto` e `Lancamento` registravam o mesmo fato econômico em tabelas
-- diferentes, e nenhuma das duas via a outra: o custo do lote e o custo por
-- arroba liam só `Gasto`; as telas de contas a pagar, plano de contas e banco
-- liam só `Lancamento`. Uma despesa lançada no Financeiro não entrava no custo do
-- lote; uma ração lançada em Gastos não aparecia no fluxo financeiro. Quem usava
-- os dois lançava duas vezes; quem usava um dos dois tinha metade da verdade.
--
-- A DECISÃO
-- Uma tabela só: `Lancamento`. Ela já era superconjunto de `Gasto` (tinha
-- parcelas, vencimento, liquidação, banco, contato) menos os campos de estoque,
-- que passam a existir nela. A tela de Gastos continua existindo como **entrada
-- rápida de despesa já paga** — ela grava um lançamento com vencimento e
-- liquidação na própria data, que é o que um "gasto" é: dinheiro que já saiu.
--
-- O que sai de granularidade: `Gasto.categoria` era texto livre e vira conta do
-- plano de contas. As categorias padrão têm conta equivalente (ver
-- CONTA_DA_CATEGORIA_GASTO no shared); categoria digitada à mão ganha uma conta
-- nova com o mesmo nome em "Outras Despesas", então nenhum nome se perde.

-- ---------------------------------------------------------------------------
-- 1. Lancamento ganha os campos de estoque que só existiam em Gasto.
-- ---------------------------------------------------------------------------
ALTER TABLE "Lancamento" ADD COLUMN "insumoId" TEXT;
ALTER TABLE "Lancamento" ADD COLUMN "quantidade" DOUBLE PRECISION;
ALTER TABLE "Lancamento" ADD COLUMN "unidade" TEXT;

ALTER TABLE "Lancamento"
  ADD CONSTRAINT "Lancamento_insumoId_fkey"
  FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Lancamento_empresaId_loteId_idx" ON "Lancamento"("empresaId", "loteId");
CREATE INDEX "Lancamento_empresaId_contaId_idx" ON "Lancamento"("empresaId", "contaId");

-- ---------------------------------------------------------------------------
-- 2. O movimento de estoque passa a apontar pro lançamento.
-- ---------------------------------------------------------------------------
ALTER TABLE "MovimentoInsumo" ADD COLUMN "lancamentoId" TEXT;

ALTER TABLE "MovimentoInsumo"
  ADD CONSTRAINT "MovimentoInsumo_lancamentoId_fkey"
  FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Garante as contas de destino em toda fazenda.
--    "Compra de Animais" é nova no plano padrão (a compra do gado é o maior
--    custo variável de quem engorda e não tinha conta).
-- ---------------------------------------------------------------------------
INSERT INTO "ContaFinanceira" ("id", "grupoId", "codigo", "nome", "ativo")
SELECT gen_random_uuid(), g."id", '2.1.7', 'Compra de Animais', true
FROM "GrupoFinanceiro" g
WHERE g."codigo" = '2.1'
  AND NOT EXISTS (
    SELECT 1 FROM "ContaFinanceira" c WHERE c."grupoId" = g."id" AND c."codigo" = '2.1.7'
  );

-- Fazenda sem plano de contas (nenhuma hoje, mas possível) recebe o mínimo pra
-- migração não perder gasto: um grupo de despesa e uma conta de diversos.
INSERT INTO "GrupoFinanceiro" ("id", "empresaId", "natureza", "codigo", "nome", "ordem")
SELECT gen_random_uuid(), e."id", 'DESPESA', '2.8', 'Outras Despesas', 8
FROM "Empresa" e
WHERE EXISTS (SELECT 1 FROM "Gasto" x WHERE x."empresaId" = e."id")
  AND NOT EXISTS (SELECT 1 FROM "GrupoFinanceiro" g WHERE g."empresaId" = e."id" AND g."codigo" = '2.8');

INSERT INTO "ContaFinanceira" ("id", "grupoId", "codigo", "nome", "ativo")
SELECT gen_random_uuid(), g."id", '2.8.3', 'Diversos', true
FROM "GrupoFinanceiro" g
WHERE g."codigo" = '2.8'
  AND NOT EXISTS (
    SELECT 1 FROM "ContaFinanceira" c WHERE c."grupoId" = g."id" AND c."codigo" = '2.8.3'
  );

-- ---------------------------------------------------------------------------
-- 4. Conta nova para cada categoria digitada à mão (fora das padrão), com o
--    mesmo nome, dentro de "Outras Despesas". É o que impede o nome de sumir.
-- ---------------------------------------------------------------------------
WITH categorias_livres AS (
  SELECT DISTINCT g."empresaId", g."categoria"
  FROM "Gasto" g
  WHERE g."categoria" NOT IN (
    'Ração', 'Suplemento mineral', 'Insumo de pasto (semente, fertilizante, defensivo)',
    'Combustível', 'Manutenção (máquinas, cercas, óleo de motor)', 'Sanidade (vacinas, medicamentos)',
    'Mão de obra', 'Aquisição de animais', 'Outros'
  )
),
numeradas AS (
  SELECT
    c."empresaId",
    c."categoria",
    gr."id" AS grupo_id,
    -- Códigos a partir de 2.8.90 para não colidir com os do plano padrão.
    '2.8.' || (89 + row_number() OVER (PARTITION BY c."empresaId" ORDER BY c."categoria"))::text AS codigo
  FROM categorias_livres c
  JOIN "GrupoFinanceiro" gr ON gr."empresaId" = c."empresaId" AND gr."codigo" = '2.8'
)
INSERT INTO "ContaFinanceira" ("id", "grupoId", "codigo", "nome", "ativo")
SELECT gen_random_uuid(), n.grupo_id, n.codigo, n."categoria", true
FROM numeradas n
WHERE NOT EXISTS (
  SELECT 1 FROM "ContaFinanceira" c WHERE c."grupoId" = n.grupo_id AND c."nome" = n."categoria"
);

-- ---------------------------------------------------------------------------
-- 5. Copia cada Gasto para Lancamento.
--    Documento, vencimento e liquidação na mesma data: gasto é dinheiro que já
--    saiu, então nasce liquidado — é isso que faz ele aparecer no fluxo de caixa
--    e no resultado sem exigir nenhuma ação a mais.
-- ---------------------------------------------------------------------------
-- Subconsulta escalar em vez de JOIN: garante EXATAMENTE uma linha por gasto.
-- Com JOIN, um código de conta repetido em dois grupos duplicaria o lançamento —
-- e duplicar despesa numa migração é o tipo de erro que ninguém percebe.
--
-- `contaId` é NOT NULL: se as três tentativas falharem, a migração aborta em vez
-- de perder o gasto em silêncio.
INSERT INTO "Lancamento" (
  "id", "empresaId", "contaId", "loteId", "descricao",
  "insumoId", "quantidade", "unidade",
  "valorTotal", "totalParcelas", "numeroParcela", "valorParcela",
  "dataDocumento", "dataVencimento", "dataLiquidacao"
)
SELECT
  g."id",            -- mantém o id: a trilha de atividades aponta pra ele
  g."empresaId",
  COALESCE(
    -- 1ª tentativa: a conta do mapa de categorias padrão.
    (SELECT c."id" FROM "ContaFinanceira" c
       JOIN "GrupoFinanceiro" gr ON gr."id" = c."grupoId"
      WHERE gr."empresaId" = g."empresaId"
        AND c."codigo" = CASE g."categoria"
          WHEN 'Ração' THEN '2.1.1'
          WHEN 'Suplemento mineral' THEN '2.1.2'
          WHEN 'Sanidade (vacinas, medicamentos)' THEN '2.1.4'
          WHEN 'Aquisição de animais' THEN '2.1.7'
          WHEN 'Insumo de pasto (semente, fertilizante, defensivo)' THEN '2.3.3'
          WHEN 'Mão de obra' THEN '2.5.2'
          WHEN 'Combustível' THEN '2.5.3'
          WHEN 'Manutenção (máquinas, cercas, óleo de motor)' THEN '2.8.1'
          WHEN 'Outros' THEN '2.8.3'
          ELSE NULL
        END
      LIMIT 1),
    -- 2ª: a conta criada no passo 4 com o nome da categoria livre.
    (SELECT c."id" FROM "ContaFinanceira" c
       JOIN "GrupoFinanceiro" gr ON gr."id" = c."grupoId"
      WHERE gr."empresaId" = g."empresaId" AND c."nome" = g."categoria"
      LIMIT 1),
    -- 3ª: rede de segurança, "Diversos".
    (SELECT c."id" FROM "ContaFinanceira" c
       JOIN "GrupoFinanceiro" gr ON gr."id" = c."grupoId"
      WHERE gr."empresaId" = g."empresaId" AND c."codigo" = '2.8.3'
      LIMIT 1)
  ),
  g."loteId",
  -- A categoria vira conta, mas o texto original acompanha a descrição: é o que
  -- permite conferir a migração depois de ela ter acontecido.
  COALESCE(NULLIF(g."descricao", ''), g."categoria"),
  g."insumoId",
  g."quantidade",
  g."unidade",
  g."valor",
  1, 1, g."valor",
  g."data", g."data", g."data"
FROM "Gasto" g;

-- ---------------------------------------------------------------------------
-- 6. Repontar o estoque e remover a tabela antiga.
-- ---------------------------------------------------------------------------
UPDATE "MovimentoInsumo" SET "lancamentoId" = "gastoId" WHERE "gastoId" IS NOT NULL;

ALTER TABLE "MovimentoInsumo" DROP CONSTRAINT IF EXISTS "MovimentoInsumo_gastoId_fkey";
ALTER TABLE "MovimentoInsumo" DROP COLUMN "gastoId";
DROP TABLE "Gasto";
