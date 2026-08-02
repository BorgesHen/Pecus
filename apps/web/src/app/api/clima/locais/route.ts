import { BadRequestException } from '@nestjs/common';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as climaService from '@/server/clima/clima.service';

// Como /clima: qualquer usuário autenticado pode buscar uma localidade.
// Quem salva a localização da fazenda é o PATCH de /empresas/configuracao,
// esse sim restrito ao responsável.
export const GET = rota(async (req) => {
  await autorizar(req);
  const termo = req.nextUrl.searchParams.get('q');
  if (!termo) throw new BadRequestException('Informe o termo de busca (q).');
  return climaService.buscarLocais(termo);
});
