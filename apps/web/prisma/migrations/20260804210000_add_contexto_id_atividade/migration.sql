-- Contexto da linha de atividade: o registro "dono" do evento.
--
-- Uma pesagem de animal era gravada com registroId = id da pesagem, então o
-- histórico do animal (que filtra por registroId = id do animal) nunca a
-- mostrava. Agora a pesagem guarda também o animal em contextoId, e o filtro
-- das telas de detalhe casa registroId OU contextoId.
ALTER TABLE "RegistroAtividade" ADD COLUMN "contextoId" TEXT;

-- Nova tabela nasce com RLS ligado por causa da migration
-- 20260804190000_fecha_acesso_publico_rls; aqui é só coluna, nada a fazer.
CREATE INDEX "RegistroAtividade_empresaId_contextoId_idx" ON "RegistroAtividade"("empresaId", "contextoId");

-- Preenche o que já está gravado. As pesagens de animal sempre guardaram o
-- animalId em `detalhes`, então o dado existe — sem este UPDATE as pesagens
-- lançadas antes desta migration ficariam de fora do histórico do animal, o
-- que pareceria bug na tela.
UPDATE "RegistroAtividade"
SET "contextoId" = "detalhes" ->> 'animalId'
WHERE "entidade" = 'pesagem'
  AND "detalhes" ->> 'animalId' IS NOT NULL;
