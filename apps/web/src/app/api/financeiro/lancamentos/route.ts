import { EntidadeAtividade, ModuloSistema, NivelAcesso, type NaturezaFinanceira } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar, brl } from '@/server/atividades/atividades.service';
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
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarLancamentoDto);
  const parcelas = await lancamentosService.criar(empresaId, dto);
  const parcelamento = parcelas.length > 1 ? ` em ${parcelas.length} parcelas` : '';
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.LANCAMENTO,
    // Parcelamento gera vários registros; o histórico aponta pra primeira
    // parcela e guarda a lista completa nos detalhes.
    parcelas[0]?.id ?? null,
    `Lançamento "${dto.descricao ?? 'sem descrição'}" de ${brl(dto.valorTotal)}${parcelamento}`,
    { parcelasIds: parcelas.map((p) => p.id), contaId: dto.contaId, loteId: dto.loteId ?? null },
  );
  return parcelas;
});
