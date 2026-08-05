-- Liga o manejo sanitário ao estoque e ao custo do animal.
--
-- O QUE FALTAVA
-- Um remédio de 1 L comprado por R$ 1.000 entrava no estoque como quantidade
-- (1) e o dinheiro ficava só no Gasto. Ao aplicar 5 ml num animal não havia
-- como (a) saber que 5 ml valem R$ 5,00, (b) baixar do estoque, nem (c) somar
-- isso no custo daquele bicho. Estas três coisas passam a existir aqui.

-- 1. Valor em reais de cada movimento de estoque.
--    Na entrada é o que se pagou (base do custo médio); na saída é o custo do
--    que saiu, ao custo médio do dia.
ALTER TABLE "MovimentoInsumo" ADD COLUMN "valorTotal" DECIMAL(12,2);

-- 2. Insumo aplicado no evento sanitário, com quantidade, unidade digitada,
--    custo congelado e o vínculo com a baixa de estoque.
ALTER TABLE "EventoSanitario" ADD COLUMN "insumoId" TEXT;
ALTER TABLE "EventoSanitario" ADD COLUMN "quantidadeInsumo" DOUBLE PRECISION;
ALTER TABLE "EventoSanitario" ADD COLUMN "unidadeInsumo" TEXT;
ALTER TABLE "EventoSanitario" ADD COLUMN "custo" DECIMAL(12,2);
ALTER TABLE "EventoSanitario" ADD COLUMN "movimentoInsumoId" TEXT;

ALTER TABLE "EventoSanitario"
  ADD CONSTRAINT "EventoSanitario_insumoId_fkey"
  FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventoSanitario"
  ADD CONSTRAINT "EventoSanitario_movimentoInsumoId_fkey"
  FOREIGN KEY ("movimentoInsumoId") REFERENCES "MovimentoInsumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Backfill do valor das entradas que já existem.
--    Toda entrada vinda de uma compra tem `gastoId`, e o gasto tem o valor pago.
--    Sem isto, o custo médio dos insumos já cadastrados nasceria vazio e as
--    primeiras aplicações sairiam sem custo, parecendo que a conta não funciona.
UPDATE "MovimentoInsumo" m
SET "valorTotal" = g."valor"
FROM "Gasto" g
WHERE m."gastoId" = g."id"
  AND m."tipo" = 'ENTRADA'
  AND m."valorTotal" IS NULL;

-- 4. Índices. Estas tabelas não tinham nenhum índice além da chave primária —
--    nem nas chaves estrangeiras, que o Postgres não indexa sozinho. São os
--    caminhos de leitura do acompanhamento do lote e do custo do animal.
CREATE INDEX "EventoSanitario_empresaId_animalId_data_idx" ON "EventoSanitario"("empresaId", "animalId", "data");
CREATE INDEX "EventoSanitario_empresaId_data_idx" ON "EventoSanitario"("empresaId", "data");
CREATE INDEX "EventoSanitario_empresaId_proximaAplicacao_idx" ON "EventoSanitario"("empresaId", "proximaAplicacao");
CREATE INDEX "MovimentoInsumo_empresaId_insumoId_tipo_idx" ON "MovimentoInsumo"("empresaId", "insumoId", "tipo");
CREATE INDEX "MovimentoInsumo_insumoId_data_idx" ON "MovimentoInsumo"("insumoId", "data");
CREATE INDEX "Gasto_empresaId_loteId_idx" ON "Gasto"("empresaId", "loteId");
CREATE INDEX "Animal_empresaId_loteId_status_idx" ON "Animal"("empresaId", "loteId", "status");
