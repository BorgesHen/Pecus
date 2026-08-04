import { EntidadeAtividade, ModuloSistema, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as metodosManejoService from '@/server/metodos-manejo/metodos-manejo.service';
import { CriarMetodoManejoDto } from '@/server/metodos-manejo/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, { moduloAtivo: ModuloSistema.METODOS_MANEJO });
  return metodosManejoService.listar(user.empresaAtivaId!);
});

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    papeis: [PapelUsuario.RESPONSAVEL],
    moduloAtivo: ModuloSistema.METODOS_MANEJO,
  });
  const dto = await validarCorpo(req, CriarMetodoManejoDto);
  const metodo = await metodosManejoService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.METODO_MANEJO,
    metodo.id,
    `Método de manejo "${metodo.nome}" cadastrado`,
  );
  return metodo;
});
