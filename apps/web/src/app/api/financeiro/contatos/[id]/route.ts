import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as contatosService from '@/server/financeiro/contatos.service';
import { AtualizarContatoDto } from '@/server/financeiro/dto/contato.dto';

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarContatoDto);
  const contato = await contatosService.atualizar(empresaId, params.id, dto);
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.CONTATO,
    contato.id,
    `Contato "${contato.nome}" editado`,
    { camposAlterados: Object.keys(dto) },
  );
  return contato;
});

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await contatosService.remover(empresaId, params.id);
  await auditar(user, empresaId).exclusao(
    EntidadeAtividade.CONTATO,
    params.id,
    `Contato "${resultado.nome}" excluído`,
  );
  return resultado;
});
