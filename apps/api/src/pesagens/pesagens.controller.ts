import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PesagensService } from './pesagens.service';
import { CriarPesagemDto } from './dto/pesagem.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsuarioAutenticado } from '@pecus/shared';

@Controller('pesagens')
export class PesagensController {
  constructor(private pesagensService: PesagensService) {}

  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado, @Query('loteId') loteId: string) {
    return this.pesagensService.listarPorLote(user.empresaAtivaId!, loteId);
  }

  @Get('gmd/:loteId')
  gmd(@CurrentUser() user: UsuarioAutenticado, @Param('loteId') loteId: string) {
    return this.pesagensService.gmd(user.empresaAtivaId!, loteId);
  }

  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarPesagemDto) {
    return this.pesagensService.criar(user.empresaAtivaId!, dto);
  }
}
