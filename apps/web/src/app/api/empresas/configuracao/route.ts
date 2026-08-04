import { EntidadeAtividade, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as empresasService from '@/server/empresas/empresas.service';
import { AtualizarConfiguracaoEmpresaDto } from '@/server/empresas/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req);
  return empresasService.obterConfiguracao(user.empresaAtivaId);
});

export const PATCH = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL] });
  const dto = await validarCorpo(req, AtualizarConfiguracaoEmpresaDto);
  const configuracao = await empresasService.atualizarConfiguracao(empresaId, dto);
  // Sem registroId: configuração não é um registro da lista, é o ajuste da
  // própria fazenda.
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.CONFIGURACAO,
    null,
    'Configurações da fazenda alteradas',
    { camposAlterados: Object.keys(dto) },
  );
  return configuracao;
});
