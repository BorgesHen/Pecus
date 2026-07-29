import { rota } from '@/server/rota';
import { validarCorpo } from '@/server/validar';
import * as authService from '@/server/auth/auth.service';
import { RegistrarDto } from '@/server/auth/dto';

export const POST = rota(async (req) => {
  const dto = await validarCorpo(req, RegistrarDto);
  return authService.registrar(dto);
});
