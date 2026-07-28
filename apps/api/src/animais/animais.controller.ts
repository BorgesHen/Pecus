import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, StatusAnimal, UsuarioAutenticado } from '@pecus/shared';
import { AnimaisService } from './animais.service';
import { CriarAnimalDto, AtualizarAnimalDto, DarSaidaAnimalDto } from './dto/animal.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@ModuloAtivo(ModuloSistema.ANIMAIS)
@Controller('animais')
export class AnimaisController {
  constructor(private animaisService: AnimaisService) {}

  @Permissao(ModuloSistema.ANIMAIS, NivelAcesso.VER)
  @Get()
  listar(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('loteId') loteId?: string,
    @Query('status') status?: StatusAnimal,
  ) {
    return this.animaisService.listar(user.empresaAtivaId!, { loteId, status });
  }

  @Permissao(ModuloSistema.ANIMAIS, NivelAcesso.VER)
  @Get(':id')
  detalhar(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.animaisService.detalhar(user.empresaAtivaId!, id);
  }

  @Permissao(ModuloSistema.ANIMAIS, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarAnimalDto) {
    return this.animaisService.criar(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.ANIMAIS, NivelAcesso.EDITAR)
  @Patch(':id')
  atualizar(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarAnimalDto,
  ) {
    return this.animaisService.atualizar(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.ANIMAIS, NivelAcesso.EDITAR)
  @Post(':id/dar-saida')
  darSaida(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: DarSaidaAnimalDto,
  ) {
    return this.animaisService.darSaida(user.empresaAtivaId!, id, dto);
  }
}
