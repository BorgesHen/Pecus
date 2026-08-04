import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as contasBancariasService from '@/server/financeiro/contas-bancarias.service';
import { AtualizarContaBancariaDto } from '@/server/financeiro/dto/conta-bancaria.dto';

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarContaBancariaDto);
  const conta = await contasBancariasService.atualizar(empresaId, params.id, dto);
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.CONTA_BANCARIA,
    conta.id,
    `Banco/caixa "${conta.nome}" editado`,
    { camposAlterados: Object.keys(dto) },
  );
  return conta;
});

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await contasBancariasService.remover(empresaId, params.id);
  await auditar(user, empresaId).exclusao(
    EntidadeAtividade.CONTA_BANCARIA,
    params.id,
    `Banco/caixa "${resultado.nome}" excluído`,
  );
  return resultado;
});
