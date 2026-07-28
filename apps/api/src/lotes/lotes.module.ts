import { Module } from '@nestjs/common';
import { EmpresasModule } from '../empresas/empresas.module';
import { LotesService } from './lotes.service';
import { LotesController } from './lotes.controller';

@Module({
  imports: [EmpresasModule],
  controllers: [LotesController],
  providers: [LotesService],
})
export class LotesModule {}
