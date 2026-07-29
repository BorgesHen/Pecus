-- Adiciona a coluna "usuario" (login) nullable primeiro, pois já existem
-- registros na tabela.
ALTER TABLE "Usuario" ADD COLUMN "usuario" TEXT;

-- Backfill: usuários existentes recebem como login o e-mail sem o domínio.
UPDATE "Usuario" SET "usuario" = split_part("email", '@', 1) WHERE "usuario" IS NULL;

-- A partir daqui, todo novo usuário é obrigado a ter um login único.
ALTER TABLE "Usuario" ALTER COLUMN "usuario" SET NOT NULL;
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");
