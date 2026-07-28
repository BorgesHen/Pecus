-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "moduloAnimaisAtivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "moduloEstoqueAtivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "moduloMetodosManejoAtivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "moduloReproducaoAtivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "moduloSanidadeAtivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rendimentoCarcacaPadrao" DOUBLE PRECISION NOT NULL DEFAULT 52,
ADD COLUMN     "sanidadeDiasAvisoVencimento" INTEGER NOT NULL DEFAULT 7;
