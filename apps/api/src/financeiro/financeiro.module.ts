import { Module } from '@nestjs/common';
import { EmpresasModule } from '../empresas/empresas.module';
import { PlanoContasService } from './plano-contas.service';
import { PlanoContasController } from './plano-contas.controller';
import { ContasBancariasService } from './contas-bancarias.service';
import { ContasBancariasController } from './contas-bancarias.controller';
import { ContatosService } from './contatos.service';
import { ContatosController } from './contatos.controller';
import { LancamentosService } from './lancamentos.service';
import { LancamentosController } from './lancamentos.controller';

@Module({
  imports: [EmpresasModule],
  controllers: [PlanoContasController, ContasBancariasController, ContatosController, LancamentosController],
  providers: [PlanoContasService, ContasBancariasService, ContatosService, LancamentosService],
})
export class FinanceiroModule {}
