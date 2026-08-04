import { BadRequestException } from '@nestjs/common';
import { EntidadeAtividade } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as authService from '@/server/auth/auth.service';
import { DefinirSenhaDto } from '@/server/auth/dto';

// `semEmpresa` + `permiteSenhaProvisoria`: é justamente a rota que a sessão
// provisória precisa alcançar pra deixar de ser provisória.
export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, { semEmpresa: true, permiteSenhaProvisoria: true });
  const dto = await validarCorpo(req, DefinirSenhaDto);

  if (dto.novaSenha !== dto.confirmacao) {
    throw new BadRequestException(['As senhas não coincidem.']);
  }

  const sessao = await authService.definirSenha(user.id, dto.novaSenha);
  // Vale registrar: é a prova de que a pessoa assumiu a conta e que a senha
  // provisória que o responsável viu já não vale mais.
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.USUARIO,
    user.id,
    `"${user.nome}" definiu a própria senha de acesso`,
  );
  return sessao;
});
