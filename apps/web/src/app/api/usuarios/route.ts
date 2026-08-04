import { EntidadeAtividade, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as usuariosService from '@/server/usuarios/usuarios.service';
import { CriarUsuarioDto } from '@/server/usuarios/dto';

const PAPEIS_GESTAO = [PapelUsuario.RESPONSAVEL];

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, { papeis: PAPEIS_GESTAO });
  return usuariosService.listarDaEmpresa(user.empresaAtivaId!);
});

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, { papeis: PAPEIS_GESTAO });
  const dto = await validarCorpo(req, CriarUsuarioDto);
  const resultado = await usuariosService.criarNaEmpresa(empresaId, dto);
  // A senha provisória do retorno NUNCA entra no log — o histórico é lido por
  // outras pessoas e fica guardado pra sempre.
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.USUARIO,
    resultado.vinculo.usuarioId,
    resultado.contaNova
      ? `Usuário "${dto.nome}" (${dto.usuario}) criado e vinculado à fazenda`
      : `Usuário "${dto.nome}" (${dto.usuario}) vinculado à fazenda`,
    { papel: resultado.vinculo.papel, contaNova: resultado.contaNova, emailEnviado: resultado.emailEnviado },
  );
  return resultado;
});
