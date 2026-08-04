import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as pesagemAnimalService from '@/server/animais/pesagem-animal.service';
import { CriarPesagemAnimalDto } from '@/server/animais/dto';

// Módulo ativo é Animais (é onde a tela vive), mas quem pode registrar peso é
// quem tem permissão de Pesagens — a mesma divisão que as pesagens de lote já
// usam. Mesmo par que as rotas de piquete fazem com Áreas/Piquetes.
export const GET = rota(async (req, { params }) => {
  const { empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.PESAGENS, nivel: NivelAcesso.VER },
  });
  return pesagemAnimalService.listar(empresaId, params.id);
});

export const POST = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.PESAGENS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarPesagemAnimalDto);
  const pesagem = await pesagemAnimalService.criar(empresaId, params.id, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.PESAGEM,
    pesagem.id,
    `Pesagem do animal ${pesagem.animalIdentificador}: ${pesagem.peso} kg`,
    { animalId: params.id },
  );
  return pesagem;
});
