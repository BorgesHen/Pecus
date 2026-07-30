-- CreateTable
CREATE TABLE "ConviteCadastro" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "observacao" TEXT,
    "usadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConviteCadastro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConviteCadastro_codigo_key" ON "ConviteCadastro"("codigo");
