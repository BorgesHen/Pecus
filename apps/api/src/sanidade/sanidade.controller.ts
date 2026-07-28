import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';
import { SanidadeService } from './sanidade.service';
import { CriarEventoSanitarioDto, AplicarEmMassaDto } from './dto/evento-sanitario.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@ModuloAtivo(ModuloSistema.SANIDADE)
@Controller('sanidade')
export class SanidadeController {
  constructor(private sanidadeService: SanidadeService) {}

  @Permissao(ModuloSistema.SANIDADE, NivelAcesso.VER)
  @Get('animal/:animalId')
  listarPorAnimal(@CurrentUser() user: UsuarioAutenticado, @Param('animalId') animalId: string) {
    return this.sanidadeService.listarPorAnimal(user.empresaAtivaId!, animalId);
  }

  @Permissao(ModuloSistema.SANIDADE, NivelAcesso.VER)
  @Get('proximos-vencimentos')
  proximosVencimentos(@CurrentUser() user: UsuarioAutenticado, @Query('dias') dias?: string) {
    return this.sanidadeService.proximosVencimentos(user.empresaAtivaId!, dias ? Number(dias) : undefined);
  }

  @Permissao(ModuloSistema.SANIDADE, NivelAcesso.VER)
  @Get('historico')
  historicoRecente(@CurrentUser() user: UsuarioAutenticado, @Query('limite') limite?: string) {
    return this.sanidadeService.historicoRecente(user.empresaAtivaId!, limite ? Number(limite) : undefined);
  }

  @Permissao(ModuloSistema.SANIDADE, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarEventoSanitarioDto) {
    return this.sanidadeService.criar(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.SANIDADE, NivelAcesso.EDITAR)
  @Post('aplicar-em-massa')
  aplicarEmMassa(@CurrentUser() user: UsuarioAutenticado, @Body() dto: AplicarEmMassaDto) {
    return this.sanidadeService.aplicarEmMassa(user.empresaAtivaId!, dto);
  }
}
