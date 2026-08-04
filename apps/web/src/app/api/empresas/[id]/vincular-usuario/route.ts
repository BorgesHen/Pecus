import { EntidadeAtividade, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { auditar } from '@/server/atividades/atividades.service';
import * as empresasService from '@/server/empresas/empresas.service';

export const POST = rota(async (req, { params }) => {
  const { user } = await autorizar(req, { papeis: [PapelUsuario.ADMIN], semEmpresa: true });
  const body = (await req.json()) as { usuarioId: string; papel: PapelUsuario };
  const vinculo = await empresasService.vincularUsuario(params.id, body.usuarioId, body.papel);
  // Registrado no histórico da fazenda que ganhou o acesso.
  await auditar(user, params.id).criacao(
    EntidadeAtividade.USUARIO,
    body.usuarioId,
    `Usuário vinculado à fazenda pelo suporte como ${body.papel}`,
    { usuarioId: body.usuarioId, papel: body.papel },
  );
  return vinculo;
});
