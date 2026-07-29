import { NextRequest, NextResponse } from 'next/server';
import { HttpException } from '@nestjs/common';

type Contexto = { params: Record<string, string> };
type Handler = (req: NextRequest, ctx: Contexto) => Promise<unknown>;

/**
 * Substitui o tratamento automático de exceções do NestJS (nenhum filtro
 * customizado existe hoje — só o HttpException default do Nest é usado).
 */
export function rota(fn: Handler) {
  return async (req: NextRequest, ctx: Contexto) => {
    try {
      const resultado = await fn(req, ctx);
      if (resultado === undefined) return new NextResponse(null, { status: 204 });
      return NextResponse.json(resultado);
    } catch (e) {
      if (e instanceof HttpException) {
        const status = e.getStatus();
        const resposta = e.getResponse();
        const corpo = typeof resposta === 'string' ? { statusCode: status, message: resposta } : resposta;
        return NextResponse.json(corpo, { status });
      }
      console.error(e);
      return NextResponse.json({ statusCode: 500, message: 'Erro interno' }, { status: 500 });
    }
  };
}
