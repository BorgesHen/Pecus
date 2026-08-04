import { EntidadeAtividade, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as usuariosService from '@/server/usuarios/usuarios.service';
import { AtualizarUsuarioDto } from '@/server/usuarios/dto';

const PAPEIS_GESTAO = [PapelUsuario.RESPONSAVEL];

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, { papeis: PAPEIS_GESTAO });
  const dto = await validarCorpo(req, AtualizarUsuarioDto);
  const usuario = await usuariosService.atualizarInfo(empresaId, params.usuarioId, dto);
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.USUARIO,
    usuario.id,
    `Dados do usuário "${usuario.nome}" (${usuario.usuario}) editados`,
    { camposAlterados: Object.keys(dto) },
  );
  return usuario;
});

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, { papeis: PAPEIS_GESTAO });
  const resultado = await usuariosService.removerDaEmpresa(empresaId, params.usuarioId);
  // Vínculo nulo = já não existia; nada foi removido, nada vai pro histórico.
  if (resultado.usuario) {
    await auditar(user, empresaId).exclusao(
      EntidadeAtividade.USUARIO,
      params.usuarioId,
      `Acesso de "${resultado.usuario.nome}" (${resultado.usuario.usuario}) removido da fazenda`,
    );
  }
  return resultado;
});
