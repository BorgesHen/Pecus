import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { GastosService } from './gastos.service';
import { CriarGastoDto } from './dto/gasto.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';

@Controller('gastos')
export class GastosController {
  constructor(private gastosService: GastosService) {}

  @Permissao(ModuloSistema.GASTOS, NivelAcesso.VER)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado, @Query('loteId') loteId?: string) {
    return this.gastosService.listar(user.empresaAtivaId!, loteId);
  }

  @Permissao(ModuloSistema.GASTOS, NivelAcesso.VER)
  @Get('por-categoria')
  porCategoria(@CurrentUser() user: UsuarioAutenticado, @Query('loteId') loteId?: string) {
    return this.gastosService.totalPorCategoria(user.empresaAtivaId!, loteId);
  }

  @Permissao(ModuloSistema.GASTOS, NivelAcesso.VER)
  @Get('categorias-customizadas')
  categoriasCustomizadas(@CurrentUser() user: UsuarioAutenticado) {
    return this.gastosService.categoriasCustomizadas(user.empresaAtivaId!);
  }

  @Permissao(ModuloSistema.GASTOS, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarGastoDto) {
    return this.gastosService.criar(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.GASTOS, NivelAcesso.EDITAR)
  @Delete(':id')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.gastosService.remover(user.empresaAtivaId!, id);
  }
}
