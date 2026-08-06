-- Abate do animal: o rendimento de carcaça real, que só existe depois da saída.
--
-- `Lote.rendimentoCarcaca` continua sendo a ESTIMATIVA usada antes do abate para
-- projetar arrobas e custo por arroba. Estas colunas guardam o REALIZADO, medido
-- no frigorífico. Separados de propósito: se o realizado sobrescrevesse a
-- estimativa, some a comparação "estimava 52%, saiu 50,8%" e toda projeção
-- passada mudaria retroativamente.
--
-- Guarda o peso de carcaça em kg, e não o percentual: é o que a nota do
-- frigorífico traz e é sobre o que o dinheiro é pago. O rendimento é derivado
-- (carcaça ÷ peso vivo) e por isso não tem coluna — duas fontes para o mesmo
-- número divergiriam.
ALTER TABLE "Animal" ADD COLUMN "pesoCarcaca" DOUBLE PRECISION;
ALTER TABLE "Animal" ADD COLUMN "dataAbate" TIMESTAMP(3);
ALTER TABLE "Animal" ADD COLUMN "pesoVivoAbate" DOUBLE PRECISION;
ALTER TABLE "Animal" ADD COLUMN "observacaoAbate" TEXT;
