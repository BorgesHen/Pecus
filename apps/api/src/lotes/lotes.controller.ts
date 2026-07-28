import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { LotesService } from './lotes.service';
import { CriarLoteDto, AtualizarLoteDto, TrocarMetodoLoteDto } from './dto/lote.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';

@Controller('lotes')
export class LotesController {
  constructor(private lotesService: LotesService) {}

  @Permissao(ModuloSistema.LOTES, NivelAcesso.VER)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.lotesService.listar(user.empresaAtivaId!);
  }

  @Permissao(ModuloSistema.LOTES, NivelAcesso.VER)
  @Get(':id')
  detalhar(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.lotesService.detalhar(user.empresaAtivaId!, id);
  }

  @Permissao(ModuloSistema.LOTES, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarLoteDto) {
    return this.lotesService.criar(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.LOTES, NivelAcesso.EDITAR)
  @Patch(':id')
  atualizar(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarLoteDto,
  ) {
    return this.lotesService.atualizar(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.LOTES, NivelAcesso.EDITAR)
  @Post(':id/trocar-metodo')
  trocarMetodo(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: TrocarMetodoLoteDto,
  ) {
    return this.lotesService.trocarMetodo(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.LOTES, NivelAcesso.EDITAR)
  @Delete(':id')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.lotesService.remover(user.empresaAtivaId!, id);
  }
}
