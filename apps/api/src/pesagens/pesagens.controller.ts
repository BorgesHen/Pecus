import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PesagensService } from './pesagens.service';
import { CriarPesagemDto } from './dto/pesagem.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';

@Controller('pesagens')
export class PesagensController {
  constructor(private pesagensService: PesagensService) {}

  @Permissao(ModuloSistema.PESAGENS, NivelAcesso.VER)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado, @Query('loteId') loteId: string) {
    return this.pesagensService.listarPorLote(user.empresaAtivaId!, loteId);
  }

  @Permissao(ModuloSistema.PESAGENS, NivelAcesso.VER)
  @Get('gmd/:loteId')
  gmd(@CurrentUser() user: UsuarioAutenticado, @Param('loteId') loteId: string) {
    return this.pesagensService.gmd(user.empresaAtivaId!, loteId);
  }

  @Permissao(ModuloSistema.PESAGENS, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarPesagemDto) {
    return this.pesagensService.criar(user.empresaAtivaId!, dto);
  }
}
