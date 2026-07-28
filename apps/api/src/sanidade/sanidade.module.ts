import { Module } from '@nestjs/common';
import { EmpresasModule } from '../empresas/empresas.module';
import { SanidadeService } from './sanidade.service';
import { SanidadeController } from './sanidade.controller';

@Module({
  imports: [EmpresasModule],
  providers: [SanidadeService],
  controllers: [SanidadeController],
})
export class SanidadeModule {}
