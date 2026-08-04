import { EntidadeAtividade, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as empresasService from '@/server/empresas/empresas.service';
import { AtualizarEmpresaDto } from '@/server/empresas/dto';

export const GET = rota(async (req, { params }) => {
  await autorizar(req, { semEmpresa: true });
  return empresasService.detalhar(params.id);
});

// Editar dados da própria fazenda: responsável pode
export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL], semEmpresa: true });
  const dto = await validarCorpo(req, AtualizarEmpresaDto);
  const empresa = await empresasService.atualizar(params.id, dto);
  await auditar(user, params.id).atualizacao(
    EntidadeAtividade.FAZENDA,
    params.id,
    `Dados da fazenda "${empresa.nome}" editados`,
    { camposAlterados: Object.keys(dto) },
  );
  return empresa;
});
