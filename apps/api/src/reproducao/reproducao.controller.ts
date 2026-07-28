import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';
import { ReproducaoService } from './reproducao.service';
import { CriarEventoReprodutivoDto } from './dto/evento-reprodutivo.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@ModuloAtivo(ModuloSistema.REPRODUCAO)
@Controller('reproducao')
export class ReproducaoController {
  constructor(private reproducaoService: ReproducaoService) {}

  @Permissao(ModuloSistema.REPRODUCAO, NivelAcesso.VER)
  @Get('matrizes')
  listarMatrizes(@CurrentUser() user: UsuarioAutenticado) {
    return this.reproducaoService.listarMatrizes(user.empresaAtivaId!);
  }

  @Permissao(ModuloSistema.REPRODUCAO, NivelAcesso.VER)
  @Get('animal/:animalId')
  listarPorAnimal(@CurrentUser() user: UsuarioAutenticado, @Param('animalId') animalId: string) {
    return this.reproducaoService.listarPorAnimal(user.empresaAtivaId!, animalId);
  }

  @Permissao(ModuloSistema.REPRODUCAO, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarEventoReprodutivoDto) {
    return this.reproducaoService.criar(user.empresaAtivaId!, dto);
  }
}
