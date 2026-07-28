import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';
import { AreasService } from './areas.service';
import { CriarAreaDto, AtualizarAreaDto } from './dto/area.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@ModuloAtivo(ModuloSistema.AREAS)
@Controller('areas')
export class AreasController {
  constructor(private areasService: AreasService) {}

  @Permissao(ModuloSistema.AREAS, NivelAcesso.VER)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.areasService.listar(user.empresaAtivaId!);
  }

  @Permissao(ModuloSistema.AREAS, NivelAcesso.VER)
  @Get(':id')
  detalhar(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.areasService.detalhar(user.empresaAtivaId!, id);
  }

  @Permissao(ModuloSistema.AREAS, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarAreaDto) {
    return this.areasService.criar(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.AREAS, NivelAcesso.EDITAR)
  @Patch(':id')
  atualizar(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarAreaDto,
  ) {
    return this.areasService.atualizar(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.AREAS, NivelAcesso.EDITAR)
  @Delete(':id')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.areasService.remover(user.empresaAtivaId!, id);
  }
}
