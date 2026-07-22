import { Module } from '@nestjs/common';
import { PesagensService } from './pesagens.service';
import { PesagensController } from './pesagens.controller';

@Module({
  controllers: [PesagensController],
  providers: [PesagensService],
})
export class PesagensModule {}
