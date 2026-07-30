import { BadRequestException } from '@nestjs/common';
import { EspecieAnimal, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as reproducaoService from '@/server/reproducao/reproducao.service';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.REPRODUCAO,
    permissao: { modulo: ModuloSistema.REPRODUCAO, nivel: NivelAcesso.VER },
  });
  const especie = req.nextUrl.searchParams.get('especie') ?? EspecieAnimal.BOVINO;
  if (!(especie in EspecieAnimal)) throw new BadRequestException('Espécie inválida.');
  return reproducaoService.indicadores(user.empresaAtivaId!, especie as EspecieAnimal);
});
