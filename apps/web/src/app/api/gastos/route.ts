import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar, brl } from '@/server/atividades/atividades.service';
import * as gastosService from '@/server/gastos/gastos.service';
import { CriarGastoDto } from '@/server/gastos/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.GASTOS,
    permissao: { modulo: ModuloSistema.GASTOS, nivel: NivelAcesso.VER },
  });
  const loteId = req.nextUrl.searchParams.get('loteId') ?? undefined;
  return gastosService.listar(user.empresaAtivaId!, loteId);
});

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.GASTOS,
    permissao: { modulo: ModuloSistema.GASTOS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarGastoDto);
  const gasto = await gastosService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.GASTO,
    gasto.id,
    // `conta` no lugar de `categoria`: depois da unificação a categoria da tela é
    // uma conta do plano, e é o nome dela que faz sentido no histórico.
    `Despesa de ${brl(Number(gasto.valorParcela))} lançada`,
    { loteId: gasto.loteId, insumoId: gasto.insumoId, contaId: gasto.contaId },
  );
  return gasto;
});
