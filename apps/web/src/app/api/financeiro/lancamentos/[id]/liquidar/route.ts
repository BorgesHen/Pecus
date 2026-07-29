import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as lancamentosService from '@/server/financeiro/lancamentos.service';
import { LiquidarLancamentoDto } from '@/server/financeiro/dto/lancamento.dto';

export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, LiquidarLancamentoDto);
  return lancamentosService.liquidar(user.empresaAtivaId!, params.id, dto);
});
