import { EntidadeAtividade, LABEL_STATUS_ANIMAL, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as animaisService from '@/server/animais/animais.service';
import { DarSaidaAnimalDto } from '@/server/animais/dto';

export const POST = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, DarSaidaAnimalDto);
  const animal = await animaisService.darSaida(empresaId, params.id, dto);
  // Saída do rebanho (venda, morte, transferência) é movimentação.
  await auditar(user, empresaId).movimentacao(
    EntidadeAtividade.ANIMAL,
    animal.id,
    `Saída do animal ${animal.identificador}: ${LABEL_STATUS_ANIMAL[dto.status]}`,
    { motivoSaida: dto.motivoSaida ?? null, dataSaida: dto.dataSaida },
  );
  return animal;
});
