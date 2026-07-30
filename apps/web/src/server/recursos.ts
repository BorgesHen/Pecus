import { ForbiddenException } from '@nestjs/common';
import { recursoPersonalizadoAtivo } from '@pecus/shared';
import { prisma } from './prisma';

/** Recursos sob encomenda liberados pra essa fazenda (ver RECURSOS_PERSONALIZADOS). */
export async function recursosDaEmpresa(empresaId: string): Promise<string[]> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { recursosPersonalizados: true },
  });
  return (empresa?.recursosPersonalizados as string[]) ?? [];
}

export async function empresaTemRecurso(empresaId: string, chave: string): Promise<boolean> {
  return recursoPersonalizadoAtivo(await recursosDaEmpresa(empresaId), chave);
}

/**
 * Barra a operação se a fazenda não tiver o recurso liberado.
 *
 * Diferente de `autorizar({ moduloAtivo })`, aqui o ADMIN também é barrado de
 * propósito: o gate é sobre o que a fazenda contratou, não sobre o poder do
 * usuário. Se o ADMIN pudesse furar, ele criaria dados (ex: um lote de ovinos)
 * que a própria fazenda não consegue ver nem editar depois.
 */
export async function garantirRecurso(empresaId: string, chave: string, mensagem: string) {
  if (!(await empresaTemRecurso(empresaId, chave))) {
    throw new ForbiddenException(mensagem);
  }
}
