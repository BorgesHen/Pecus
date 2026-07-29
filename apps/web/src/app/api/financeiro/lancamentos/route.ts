import { ModuloSistema, NivelAcesso, type NaturezaFinanceira } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as lancamentosService from '@/server/financeiro/lancamentos.service';
import { CriarLancamentoDto } from '@/server/financeiro/dto/lancamento.dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.VER },
  });
  const params = req.nextUrl.searchParams;
  const natureza = (params.get('natureza') ?? undefined) as NaturezaFinanceira | undefined;
  const loteId = params.get('loteId') ?? undefined;
  const contaId = params.get('contaId') ?? undefined;
  const de = params.get('de') ?? undefined;
  const ate = params.get('ate') ?? undefined;
  const status = (params.get('status') ?? undefined) as 'aberto' | 'liquidado' | undefined;
  return lancamentosService.listar(user.empresaAtivaId!, { natureza, loteId, contaId, de, ate, status });
});

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarLancamentoDto);
  return lancamentosService.criar(user.empresaAtivaId!, dto);
});
