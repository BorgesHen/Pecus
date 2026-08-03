import { BadRequestException } from '@nestjs/common';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as authService from '@/server/auth/auth.service';
import { DefinirSenhaDto } from '@/server/auth/dto';

// `semEmpresa` + `permiteSenhaProvisoria`: é justamente a rota que a sessão
// provisória precisa alcançar pra deixar de ser provisória.
export const POST = rota(async (req) => {
  const { user } = await autorizar(req, { semEmpresa: true, permiteSenhaProvisoria: true });
  const dto = await validarCorpo(req, DefinirSenhaDto);

  if (dto.novaSenha !== dto.confirmacao) {
    throw new BadRequestException(['As senhas não coincidem.']);
  }

  return authService.definirSenha(user.id, dto.novaSenha);
});
