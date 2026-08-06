-- Receita da venda do animal, fechando o ciclo custo → receita → lucro.
--
-- Faltava o outro lado da conta: o sistema sabia quanto o animal custou e não
-- sabia por quanto foi vendido, então LUCRO não era calculável em lugar nenhum.
--
-- `valorRecebido` guarda o TOTAL, não o R$/@: o R$/@ é razão derivada
-- (total ÷ arrobas) e guardar a razão perderia o total, que é o que entra no
-- caixa. A tela aceita digitar o R$/@ e converte antes de enviar.
ALTER TABLE "Animal" ADD COLUMN "valorRecebido" DECIMAL(14,2);

-- O lançamento passa a poder apontar pro animal. Serve a duas coisas: receita por
-- cabeça, e não duplicar o lançamento quando o abate é corrigido (acha o
-- lançamento daquele animal e atualiza em vez de criar outro).
ALTER TABLE "Lancamento" ADD COLUMN "animalId" TEXT;

ALTER TABLE "Lancamento"
  ADD CONSTRAINT "Lancamento_animalId_fkey"
  FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Lancamento_empresaId_animalId_idx" ON "Lancamento"("empresaId", "animalId");

-- Conta de receita para categoria de animal sem conta própria no plano (bezerro,
-- touro, ovino) — sem ela a venda desses não teria onde ser classificada.
INSERT INTO "ContaFinanceira" ("id", "grupoId", "codigo", "nome", "ativo")
SELECT gen_random_uuid(), g."id", '1.1.4', 'Outros Animais', true
FROM "GrupoFinanceiro" g
WHERE g."codigo" = '1.1'
  AND NOT EXISTS (
    SELECT 1 FROM "ContaFinanceira" c WHERE c."grupoId" = g."id" AND c."codigo" = '1.1.4'
  );
