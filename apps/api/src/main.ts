import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS liberado para o frontend web/mobile em dev
  app.enableCors({ origin: true, credentials: true });

  // Validação automática dos DTOs via class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3333;
  await app.listen(port);
  console.log(`API rodando em http://localhost:${port}/api`);
}
bootstrap();
