import { EntidadeAtividade, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as empresasService from '@/server/empresas/empresas.service';
import { AtualizarRecursosPersonalizadosDto } from '@/server/empresas/dto';

// Só ADMIN — o responsável da fazenda nem sabe que essa lista existe.
export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, { papeis: [PapelUsuario.ADMIN], semEmpresa: true });
  const dto = await validarCorpo(req, AtualizarRecursosPersonalizadosDto);
  const configuracao = await empresasService.atualizarRecursosPersonalizados(params.id, dto);
  // Vai pro histórico da fazenda afetada (params.id), não da fazenda ativa do
  // ADMIN — que normalmente não tem nenhuma.
  await auditar(user, params.id).atualizacao(
    EntidadeAtividade.FAZENDA,
    params.id,
    'Recursos personalizados da fazenda atualizados pelo suporte',
    { recursos: configuracao.recursosPersonalizados },
  );
  return configuracao;
});
