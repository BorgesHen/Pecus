import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as pesagensService from '@/server/pesagens/pesagens.service';
import { CriarPesagemDto } from '@/server/pesagens/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, { permissao: { modulo: ModuloSistema.PESAGENS, nivel: NivelAcesso.VER } });
  const loteId = req.nextUrl.searchParams.get('loteId') ?? '';
  return pesagensService.listarPorLote(user.empresaAtivaId!, loteId);
});

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    permissao: { modulo: ModuloSistema.PESAGENS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarPesagemDto);
  const pesagem = await pesagensService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.PESAGEM,
    pesagem.id,
    `Pesagem do lote "${pesagem.loteIdentificacao}": ${pesagem.pesoMedio} kg de média`,
    { loteId: dto.loteId },
  );
  return pesagem;
});
