import { Module } from '@nestjs/common';
import { EmpresasModule } from '../empresas/empresas.module';
import { GastosService } from './gastos.service';
import { GastosController } from './gastos.controller';

@Module({
  imports: [EmpresasModule],
  controllers: [GastosController],
  providers: [GastosService],
})
export class GastosModule {}
