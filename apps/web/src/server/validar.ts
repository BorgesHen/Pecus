import 'reflect-metadata';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

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
    const mensagens = erros.flatMap((e) => Object.values(e.constraints ?? {}));
    throw new BadRequestException(mensagens.length > 0 ? mensagens : ['Dados inválidos.']);
  }

  return instancia;
}
