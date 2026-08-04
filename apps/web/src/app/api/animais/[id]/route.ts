import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as animaisService from '@/server/animais/animais.service';
import { AtualizarAnimalDto } from '@/server/animais/dto';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.VER },
  });
  return animaisService.detalhar(user.empresaAtivaId!, params.id);
});

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarAnimalDto);
  const { movimentacaoDeLote, ...animal } = await animaisService.atualizar(empresaId, params.id, dto);
  const log = auditar(user, empresaId);

  // Trocar o animal de lote é movimentação de rebanho, não uma edição
  // qualquer: é o que se procura no histórico ("quem tirou o 123 do lote A?").
  if (movimentacaoDeLote) {
    await log.movimentacao(
      EntidadeAtividade.ANIMAL,
      animal.id,
      `Animal ${animal.identificador} movido do lote "${movimentacaoDeLote.de ?? '—'}" para "${movimentacaoDeLote.para}"`,
    );
  } else {
    await log.atualizacao(EntidadeAtividade.ANIMAL, animal.id, `Animal ${animal.identificador} editado`, {
      camposAlterados: Object.keys(dto),
    });
  }
  return animal;
});
