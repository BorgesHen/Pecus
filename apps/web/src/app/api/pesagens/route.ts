import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as pesagensService from '@/server/pesagens/pesagens.service';
import { CriarPesagemDto } from '@/server/pesagens/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, { permissao: { modulo: ModuloSistema.PESAGENS, nivel: NivelAcesso.VER } });
  const loteId = req.nextUrl.searchParams.get('loteId') ?? '';
  return pesagensService.listarPorLote(user.empresaAtivaId!, loteId);
});

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, { permissao: { modulo: ModuloSistema.PESAGENS, nivel: NivelAcesso.EDITAR } });
  const dto = await validarCorpo(req, CriarPesagemDto);
  return pesagensService.criar(user.empresaAtivaId!, dto);
});
