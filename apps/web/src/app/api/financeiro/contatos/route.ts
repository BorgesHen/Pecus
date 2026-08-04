import { EntidadeAtividade, LABEL_TIPO_CONTATO, ModuloSistema, NivelAcesso } from '@pecus/shared';
import type { TipoContato } from '@prisma/client';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
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
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarContatoDto);
  const contato = await contatosService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.CONTATO,
    contato.id,
    `Contato "${contato.nome}" (${LABEL_TIPO_CONTATO[contato.tipo]}) cadastrado`,
  );
  return contato;
});
