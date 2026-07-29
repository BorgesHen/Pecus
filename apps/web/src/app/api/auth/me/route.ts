import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';

/** Retorna os dados do usuário logado (útil pro front validar a sessão). */
export const GET = rota(async (req) => {
  const { user } = await autorizar(req);
  return user;
});
