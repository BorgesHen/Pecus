import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as lotesService from '@/server/lotes/lotes.service';
import { CriarLoteDto } from '@/server/lotes/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.VER },
  });
  return lotesService.listar(user.empresaAtivaId!);
});

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarLoteDto);
  const lote = await lotesService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.LOTE,
    lote.id,
    `Lote "${lote.identificacao}" cadastrado com ${lote.quantidadeAnimais} cabeça(s)`,
  );
  return lote;
});
