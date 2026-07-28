import { Module } from '@nestjs/common';
import { EmpresasModule } from '../empresas/empresas.module';
import { ReproducaoService } from './reproducao.service';
import { ReproducaoController } from './reproducao.controller';

@Module({
  imports: [EmpresasModule],
  providers: [ReproducaoService],
  controllers: [ReproducaoController],
})
export class ReproducaoModule {}
