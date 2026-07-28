import { Module } from '@nestjs/common';
import { PiquetesService } from './piquetes.service';
import { PiquetesController } from './piquetes.controller';

@Module({
  controllers: [PiquetesController],
  providers: [PiquetesService],
})
export class PiquetesModule {}
