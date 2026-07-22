import { Module } from '@nestjs/common';
import { MetodosManejoService } from './metodos-manejo.service';
import { MetodosManejoController } from './metodos-manejo.controller';

@Module({
  controllers: [MetodosManejoController],
  providers: [MetodosManejoService],
})
export class MetodosManejoModule {}
