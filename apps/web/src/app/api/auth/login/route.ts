import { rota } from '@/server/rota';
import { validarCorpo } from '@/server/validar';
import { ipDoRequest } from '@/server/rate-limit';
import * as authService from '@/server/auth/auth.service';
import { LoginDto } from '@/server/auth/dto';

export const POST = rota(async (req) => {
  const dto = await validarCorpo(req, LoginDto);
  return authService.login(dto, ipDoRequest(req));
});
