import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as lotesService from '@/server/lotes/lotes.service';
import { AtualizarLoteDto } from '@/server/lotes/dto';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.VER },
  });
  return lotesService.detalhar(user.empresaAtivaId!, params.id);
});

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarLoteDto);
  const lote = await lotesService.atualizar(empresaId, params.id, dto);
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.LOTE,
    lote.id,
    `Lote "${lote.identificacao}" editado`,
    // Guarda só os campos que vieram no PATCH: é o que responde "o que mudou".
    { camposAlterados: Object.keys(dto) },
  );
  return lote;
});

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await lotesService.remover(empresaId, params.id);
  await auditar(user, empresaId).exclusao(
    EntidadeAtividade.LOTE,
    params.id,
    `Lote "${resultado.identificacao}" excluído`,
  );
  return resultado;
});
