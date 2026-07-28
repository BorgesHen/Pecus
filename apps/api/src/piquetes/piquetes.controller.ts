import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';
import { PiquetesService } from './piquetes.service';
import { CriarPiqueteDto, AtualizarPiqueteDto, RegistrarAlturaDto, MoverGadoDto } from './dto/piquete.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@ModuloAtivo(ModuloSistema.AREAS)
@Controller('piquetes')
export class PiquetesController {
  constructor(private piquetesService: PiquetesService) {}

  @Permissao(ModuloSistema.PIQUETES, NivelAcesso.VER)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado, @Query('areaId') areaId: string) {
    return this.piquetesService.listarPorArea(user.empresaAtivaId!, areaId);
  }

  @Permissao(ModuloSistema.PIQUETES, NivelAcesso.VER)
  @Get(':id/alturas')
  listarAlturas(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.piquetesService.listarAlturas(user.empresaAtivaId!, id);
  }

  @Permissao(ModuloSistema.PIQUETES, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarPiqueteDto) {
    return this.piquetesService.criar(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.PIQUETES, NivelAcesso.EDITAR)
  @Patch(':id')
  atualizar(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarPiqueteDto,
  ) {
    return this.piquetesService.atualizar(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.PIQUETES, NivelAcesso.EDITAR)
  @Delete(':id')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.piquetesService.remover(user.empresaAtivaId!, id);
  }

  @Permissao(ModuloSistema.PIQUETES, NivelAcesso.EDITAR)
  @Post(':id/alturas')
  registrarAltura(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: RegistrarAlturaDto,
  ) {
    return this.piquetesService.registrarAltura(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.PIQUETES, NivelAcesso.EDITAR)
  @Post(':id/mover-gado')
  moverGado(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: MoverGadoDto,
  ) {
    return this.piquetesService.moverGado(user.empresaAtivaId!, id, dto);
  }
}
