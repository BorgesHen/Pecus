import { EntidadeAtividade, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { auditar } from '@/server/atividades/atividades.service';
import * as usuariosService from '@/server/usuarios/usuarios.service';

export const POST = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL] });
  const resultado = await usuariosService.resetarSenha(empresaId, params.usuarioId);
  // Registra o fato, nunca a senha: quem lê o histórico não pode sair dele
  // com o acesso de outra pessoa.
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.USUARIO,
    params.usuarioId,
    `Senha de "${resultado.nome}" (${resultado.usuario}) resetada`,
    { emailEnviado: resultado.emailEnviado },
  );
  return resultado;
});
