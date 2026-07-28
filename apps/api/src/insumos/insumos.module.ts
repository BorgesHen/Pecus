import { Module } from '@nestjs/common';
import { EmpresasModule } from '../empresas/empresas.module';
import { InsumosService } from './insumos.service';
import { InsumosController } from './insumos.controller';

@Module({
  imports: [EmpresasModule],
  providers: [InsumosService],
  controllers: [InsumosController],
})
export class InsumosModule {}
