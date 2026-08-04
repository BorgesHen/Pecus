import { EntidadeAtividade, LABEL_TIPO_EVENTO_SANITARIO, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as sanidadeService from '@/server/sanidade/sanidade.service';
import { CriarEventoSanitarioDto } from '@/server/sanidade/dto';

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.SANIDADE,
    permissao: { modulo: ModuloSistema.SANIDADE, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarEventoSanitarioDto);
  const evento = await sanidadeService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.EVENTO_SANITARIO,
    evento.id,
    `${LABEL_TIPO_EVENTO_SANITARIO[evento.tipo]} "${evento.nome}" no animal ${evento.animalIdentificador}`,
    { animalId: evento.animalId },
  );
  return evento;
});
