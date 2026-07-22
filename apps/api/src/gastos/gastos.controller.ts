import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { GastosService } from './gastos.service';
import { CriarGastoDto } from './dto/gasto.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsuarioAutenticado } from '@pecus/shared';

@Controller('gastos')
export class GastosController {
  constructor(private gastosService: GastosService) {}

  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado, @Query('loteId') loteId?: string) {
    return this.gastosService.listar(user.empresaAtivaId!, loteId);
  }

  @Get('por-categoria')
  porCategoria(@CurrentUser() user: UsuarioAutenticado, @Query('loteId') loteId?: string) {
    return this.gastosService.totalPorCategoria(user.empresaAtivaId!, loteId);
  }

  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarGastoDto) {
    return this.gastosService.criar(user.empresaAtivaId!, dto);
  }

  @Delete(':id')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.gastosService.remover(user.empresaAtivaId!, id);
  }
}
