import { PrismaClient, PapelUsuario, TipoMetodoManejo } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const METODOS_PADRAO: { nome: string; tipo: TipoMetodoManejo }[] = [
  { nome: 'TIP - Terminação Intensiva a Pasto', tipo: TipoMetodoManejo.TIP },
  { nome: 'Confinamento', tipo: TipoMetodoManejo.CONFINAMENTO },
  { nome: 'Semiconfinamento', tipo: TipoMetodoManejo.SEMICONFINAMENTO },
  { nome: 'Extensivo (pasto)', tipo: TipoMetodoManejo.EXTENSIVO },
  { nome: 'Recria', tipo: TipoMetodoManejo.RECRIA },
];

async function main() {
  // Métodos de manejo globais (empresaId = null)
  for (const { nome, tipo } of METODOS_PADRAO) {
    const existe = await prisma.metodoManejo.findFirst({
      where: { nome, empresaId: null },
    });
    if (existe) {
      if (existe.tipo !== tipo) {
        await prisma.metodoManejo.update({ where: { id: existe.id }, data: { tipo } });
      }
    } else {
      await prisma.metodoManejo.create({ data: { nome, empresaId: null, tipo } });
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
        usuario: 'admin',
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
