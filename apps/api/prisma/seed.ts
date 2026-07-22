import { PrismaClient, PapelUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const METODOS_PADRAO = [
  'TIP - Terminação Intensiva a Pasto',
  'Confinamento',
  'Semiconfinamento',
  'Extensivo (pasto)',
  'Recria',
];

async function main() {
  // Métodos de manejo globais (empresaId = null)
  for (const nome of METODOS_PADRAO) {
    const existe = await prisma.metodoManejo.findFirst({
      where: { nome, empresaId: null },
    });
    if (!existe) {
      await prisma.metodoManejo.create({ data: { nome, empresaId: null } });
    }
  }

  // Usuário ADMIN de suporte (troque a senha depois!)
  const adminEmail = 'admin@pecus.local';
  const jaExiste = await prisma.usuario.findUnique({ where: { email: adminEmail } });
  if (!jaExiste) {
    await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email: adminEmail,
        senhaHash: await bcrypt.hash('admin123', 10),
        papelGlobal: PapelUsuario.ADMIN,
      },
    });
    console.log(`Admin criado: ${adminEmail} / senha: admin123`);
  }

  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
