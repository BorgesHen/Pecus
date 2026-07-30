import { BadRequestException } from '@nestjs/common';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as climaService from '@/server/clima/clima.service';

// Sem @Roles/@Permissao — qualquer usuário autenticado pode consultar a previsão.
export const GET = rota(async (req) => {
  await autorizar(req);
  const lat = Number(req.nextUrl.searchParams.get('lat'));
  const lon = Number(req.nextUrl.searchParams.get('lon'));
  if (!req.nextUrl.searchParams.get('lat') || !req.nextUrl.searchParams.get('lon')) {
    throw new BadRequestException('Informe lat e lon.');
  }
  return climaService.previsao(lat, lon);
});
