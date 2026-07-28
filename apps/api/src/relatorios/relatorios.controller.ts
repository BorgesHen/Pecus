import { Controller, Get, Param } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';
import { RelatoriosService } from './relatorios.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@Permissao(ModuloSistema.RELATORIOS, NivelAcesso.VER)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private service: RelatoriosService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.dashboard(user.empresaAtivaId!);
  }

  @Get('custo-arroba/:loteId')
  custoArroba(@CurrentUser() user: UsuarioAutenticado, @Param('loteId') loteId: string) {
    return this.service.custoPorArroba(user.empresaAtivaId!, loteId);
  }

  @Get('indicadores-metodo/:loteId')
  indicadoresMetodo(@CurrentUser() user: UsuarioAutenticado, @Param('loteId') loteId: string) {
    return this.service.indicadoresMetodo(user.empresaAtivaId!, loteId);
  }
}
