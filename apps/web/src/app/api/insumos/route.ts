import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as insumosService from '@/server/insumos/insumos.service';
import { CriarInsumoDto } from '@/server/insumos/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.VER },
  });
  return insumosService.listar(user.empresaAtivaId!);
});

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarInsumoDto);
  const insumo = await insumosService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.INSUMO,
    insumo.id,
    `Insumo "${insumo.nome}" cadastrado (${insumo.unidade})`,
  );
  return insumo;
});
