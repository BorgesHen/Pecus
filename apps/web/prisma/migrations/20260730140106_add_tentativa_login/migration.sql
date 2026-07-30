-- CreateTable
CREATE TABLE "TentativaLogin" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaLogin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TentativaLogin_usuario_createdAt_idx" ON "TentativaLogin"("usuario", "createdAt");

-- CreateIndex
CREATE INDEX "TentativaLogin_ip_createdAt_idx" ON "TentativaLogin"("ip", "createdAt");
