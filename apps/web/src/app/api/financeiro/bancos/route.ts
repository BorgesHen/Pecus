import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as contasBancariasService from '@/server/financeiro/contas-bancarias.service';
import { CriarContaBancariaDto } from '@/server/financeiro/dto/conta-bancaria.dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.VER },
  });
  return contasBancariasService.listar(user.empresaAtivaId!);
});

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarContaBancariaDto);
  const conta = await contasBancariasService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.CONTA_BANCARIA,
    conta.id,
    `Banco/caixa "${conta.nome}" cadastrado`,
  );
  return conta;
});
