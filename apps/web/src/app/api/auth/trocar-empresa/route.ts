import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as authService from '@/server/auth/auth.service';
import { TrocarEmpresaDto } from '@/server/auth/dto';

/** Reemite o token com outra empresa ativa — usado pelo seletor de empresa (multi-fazenda/consultor). */
export const POST = rota(async (req) => {
  const { user } = await autorizar(req);
  const dto = await validarCorpo(req, TrocarEmpresaDto);
  return authService.trocarEmpresa(user.id, dto.empresaId);
});
