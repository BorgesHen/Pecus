import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as planoContasService from '@/server/financeiro/plano-contas.service';
import { CriarContaFinanceiraDto } from '@/server/financeiro/dto/conta-financeira.dto';

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarContaFinanceiraDto);
  const conta = await planoContasService.criarConta(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.PLANO_CONTAS,
    conta.id,
    `Conta ${conta.codigo} - "${conta.nome}" cadastrada no plano de contas`,
    { grupoId: dto.grupoId },
  );
  return conta;
});
