-- Duas correções no custo de insumo.
--
-- 1) CUSTO ABAIXO DE UM CENTAVO ERA DESTRUÍDO
-- O custo era gravado em Decimal(12,2). A dose de um animal pode custar menos
-- de um centavo: 0,2 ml de um produto de R$ 12,00/L custa R$ 0,0024, que em
-- centavos virava R$ 0,00 — o valor não aparecia arredondado, ele DESAPARECIA
-- do custo do animal. Cinquenta doses dessas somam R$ 0,12 e também sumiam.
-- Quatro casas é a precisão usual de custo unitário; o total continua sendo
-- exibido em centavos.
ALTER TABLE "EventoSanitario" ALTER COLUMN "custo" TYPE DECIMAL(14,4);
ALTER TABLE "MovimentoInsumo" ALTER COLUMN "valorTotal" TYPE DECIMAL(14,4);

-- 2) CONSUMO DE ESTOQUE NÃO VIRAVA CUSTO DE NINGUÉM
-- Comprar ração pelo estoque gerava um Gasto com insumo, e esse gasto ficou
-- fora do rateio do lote de propósito (comprar não é consumir — senão o valor
-- entraria duas vezes quando o insumo fosse aplicado num animal). Mas o consumo
-- não era atribuído a lote nenhum, então a ração comprada por esse caminho não
-- entrava em custo algum: sumia entre a compra e o uso.
--
-- Com `loteId` na SAÍDA, o consumo passa a ser o custo — que é onde ele
-- realmente acontece.
ALTER TABLE "MovimentoInsumo" ADD COLUMN "loteId" TEXT;

ALTER TABLE "MovimentoInsumo"
  ADD CONSTRAINT "MovimentoInsumo_loteId_fkey"
  FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "MovimentoInsumo_empresaId_loteId_idx" ON "MovimentoInsumo"("empresaId", "loteId");
