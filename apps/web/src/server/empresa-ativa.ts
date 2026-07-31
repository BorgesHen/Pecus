import { BadRequestException } from '@nestjs/common';

/**
 * Garante que a sessão tem uma fazenda ativa, devolvendo o id já estreitado.
 *
 * As rotas passam `user.empresaAtivaId!`, mas esse `!` é só uma promessa ao
 * TypeScript: o ADMIN de suporte pode não ter nenhuma fazenda vinculada, e aí
 * o valor chega undefined em tempo de execução. Sem esse guarda acontecem duas
 * coisas ruins:
 *
 *  - `findUnique({ where: { id: undefined } })` estoura, e o usuário vê um
 *    500 "Erro interno" sem explicação;
 *  - em `where` não-único, o Prisma trata undefined como "sem filtro", então a
 *    consulta silenciosamente agrega dados de TODAS as fazendas.
 */
export function garantirEmpresaAtiva(empresaId: string | undefined | null): string {
  if (!empresaId) {
    throw new BadRequestException(
      'Nenhuma fazenda ativa na sessão. Selecione uma fazenda para continuar.',
    );
  }
  return empresaId;
}
