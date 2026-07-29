import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import type { TipoContato } from '@prisma/client';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as contatosService from '@/server/financeiro/contatos.service';
import { CriarContatoDto } from '@/server/financeiro/dto/contato.dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.VER },
  });
  const tipo = (req.nextUrl.searchParams.get('tipo') ?? undefined) as TipoContato | undefined;
  return contatosService.listar(user.empresaAtivaId!, tipo);
});

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarContatoDto);
  return contatosService.criar(user.empresaAtivaId!, dto);
});
