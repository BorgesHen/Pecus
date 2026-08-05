import 'reflect-metadata';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { traduzirRestricao } from '@pecus/shared';

/**
 * Substitui o ValidationPipe global do NestJS
 * (whitelist: true, transform: true, forbidNonWhitelisted: true).
 */
export async function validarCorpo<T extends object>(req: Request, Dto: ClassConstructor<T>): Promise<T> {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    corpo = {};
  }

  const instancia = plainToInstance(Dto, corpo);
  const erros = await validate(instancia as object, { whitelist: true, forbidNonWhitelisted: true });

  if (erros.length > 0) {
    const mensagens = traduzir(erros);
    throw new BadRequestException(mensagens.length > 0 ? mensagens : ['Dados inválidos.']);
  }

  return instancia;
}

/**
 * Traduz os erros pra português antes de virarem mensagem de tela.
 *
 * Sem isto o produtor via "areaHectares must not be less than 0" — nome de coluna
 * e inglês. `traduzirRestricao` (no shared) devolve a mensagem original quando não
 * conhece a regra, então nenhuma validação fica muda.
 *
 * Percorre `children` porque DTO com objeto aninhado reporta o erro no filho, e
 * ignorar isso deixaria a mensagem em "Dados inválidos.".
 */
function traduzir(erros: ValidationError[]): string[] {
  return erros.flatMap((erro) => {
    const proprias = Object.entries(erro.constraints ?? {}).map(([chave, mensagemOriginal]) =>
      traduzirRestricao(erro.property, { chave, mensagemOriginal }),
    );
    return [...proprias, ...traduzir(erro.children ?? [])];
  });
}
