import { rota } from '@/server/rota';
import { validarCorpo } from '@/server/validar';
import { ipDoRequest } from '@/server/rate-limit';
import * as authService from '@/server/auth/auth.service';
import { EsqueciSenhaDto } from '@/server/auth/dto';

// Público, como o login: quem esqueceu a senha não tem sessão. A proteção é o
// limitador por usuário/IP dentro do service.
export const POST = rota(async (req) => {
  const dto = await validarCorpo(req, EsqueciSenhaDto);
  return authService.esqueciSenha(dto.usuario, ipDoRequest(req));
});
