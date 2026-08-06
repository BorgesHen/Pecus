import {
  EntidadeAtividade,
  ModuloSistema,
  NivelAcesso,
} from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as abateService from '@/server/animais/abate.service';
import { RegistrarAbateDto } from '@/server/animais/dto';

/**
 * Abate do animal — o rendimento de carcaça que só existe depois da saída.
 *
 * Permissão de **Animais**, e não de Gastos: peso de carcaça é dado zootécnico,
 * não financeiro. Quem registra a saída do animal é quem recebe a nota do
 * frigorífico e lança o peso.
 */
export const GET = rota(async (req, { params }) => {
  const { empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.VER },
  });
  return abateService.obterAbate(empresaId, params.id);
});

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, RegistrarAbateDto);
  const abate = await abateService.registrarAbate(empresaId, params.id, dto);

  // O rendimento entra na descrição porque é o número que interessa depois: sem
  // ele a linha diria só "carcaça informada", sem dizer se rendeu bem.
  const rendimento = abate.rendimento != null ? ` — rendimento ${abate.rendimento}%` : '';
  await auditar(user, empresaId).noContexto(params.id).atualizacao(
    EntidadeAtividade.ANIMAL,
    params.id,
    `Abate do animal ${abate.animalIdentificador}: ${abate.pesoCarcaca} kg de carcaça${rendimento}`,
    {
      pesoCarcaca: abate.pesoCarcaca,
      pesoVivo: abate.pesoVivo,
      origemPesoVivo: abate.origemPesoVivo,
      rendimento: abate.rendimento,
      arrobas: abate.arrobas,
    },
  );
  return abate;
});

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await abateService.removerAbate(empresaId, params.id);
  // Sem abate gravado, nada aconteceu de fato — nada vai pro histórico.
  if (resultado.tinhaAbate) {
    await auditar(user, empresaId).noContexto(params.id).exclusao(
      EntidadeAtividade.ANIMAL,
      params.id,
      `Abate do animal ${resultado.identificador} removido (${resultado.pesoCarcaca} kg de carcaça)`,
    );
  }
  return resultado;
});
