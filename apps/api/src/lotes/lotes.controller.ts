import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { LotesService } from './lotes.service';
import { CriarLoteDto, AtualizarLoteDto } from './dto/lote.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsuarioAutenticado } from '@pecus/shared';

@Controller('lotes')
export class LotesController {
  constructor(private lotesService: LotesService) {}

  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.lotesService.listar(user.empresaAtivaId!);
  }

  @Get(':id')
  detalhar(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.lotesService.detalhar(user.empresaAtivaId!, id);
  }

  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarLoteDto) {
    return this.lotesService.criar(user.empresaAtivaId!, dto);
  }

  @Patch(':id')
  atualizar(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarLoteDto,
  ) {
    return this.lotesService.atualizar(user.empresaAtivaId!, id, dto);
  }

  @Delete(':id')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.lotesService.remover(user.empresaAtivaId!, id);
  }
}
