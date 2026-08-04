import { EntidadeAtividade, ModuloSistema, NivelAcesso, type StatusAnimal } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar, temPermissao } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as animaisService from '@/server/animais/animais.service';
import { CriarAnimalDto } from '@/server/animais/dto';

export const GET = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.VER },
  });
  const loteId = req.nextUrl.searchParams.get('loteId') ?? undefined;
  const status = (req.nextUrl.searchParams.get('status') as StatusAnimal | null) ?? undefined;
  // Peso e GMD só pra quem tem o módulo Pesagens; ver o comentário em listar().
  const incluirPeso = await temPermissao(user, ModuloSistema.PESAGENS, NivelAcesso.VER);
  return animaisService.listar(empresaId, { loteId, status }, incluirPeso);
});

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarAnimalDto);
  const animal = await animaisService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.ANIMAL,
    animal.id,
    `Animal ${animal.identificador} cadastrado`,
  );
  return animal;
});
