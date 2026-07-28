import { Module } from '@nestjs/common';
import { EmpresasModule } from '../empresas/empresas.module';
import { AnimaisService } from './animais.service';
import { AnimaisController } from './animais.controller';

@Module({
  imports: [EmpresasModule],
  providers: [AnimaisService],
  controllers: [AnimaisController],
})
export class AnimaisModule {}
