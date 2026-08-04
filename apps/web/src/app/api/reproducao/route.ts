import { EntidadeAtividade, LABEL_TIPO_EVENTO_REPRODUTIVO, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as reproducaoService from '@/server/reproducao/reproducao.service';
import { CriarEventoReprodutivoDto } from '@/server/reproducao/dto';

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.REPRODUCAO,
    permissao: { modulo: ModuloSistema.REPRODUCAO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarEventoReprodutivoDto);
  const evento = await reproducaoService.criar(empresaId, dto);
  const crias = evento.criasCadastradas.length > 0 ? ` — cria(s) ${evento.criasCadastradas.join(', ')}` : '';
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.EVENTO_REPRODUTIVO,
    evento.id,
    `${LABEL_TIPO_EVENTO_REPRODUTIVO[evento.tipo]} da matriz ${evento.animalIdentificador}${crias}`,
    { animalId: evento.animalId, numeroCrias: evento.numeroCrias ?? null },
  );
  return evento;
});
