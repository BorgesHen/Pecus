-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "emailVerificadoEm" TIMESTAMP(3),
ADD COLUMN     "senhaProvisoria" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senhaProvisoriaEnviadaPorEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senhaProvisoriaExpiraEm" TIMESTAMP(3);
