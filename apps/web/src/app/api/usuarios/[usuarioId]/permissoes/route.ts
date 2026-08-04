import { EntidadeAtividade, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as usuariosService from '@/server/usuarios/usuarios.service';
import { AtualizarPermissoesDto } from '@/server/usuarios/dto';

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL] });
  const dto = await validarCorpo(req, AtualizarPermissoesDto);
  const vinculo = await usuariosService.atualizarPermissoes(empresaId, params.usuarioId, dto);
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.USUARIO,
    params.usuarioId,
    `Permissões de "${vinculo.usuario.nome}" (${vinculo.usuario.usuario}) alteradas`,
    // Guarda o novo conjunto: em acesso a dados, saber "o que ficou valendo" é
    // o que importa na hora de investigar.
    { permissoes: dto.permissoes },
  );
  return vinculo;
});
