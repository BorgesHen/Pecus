import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';
import { TipoContato } from '@prisma/client';
import { ContatosService } from './contatos.service';
import { CriarContatoDto, AtualizarContatoDto } from './dto/contato.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@ModuloAtivo(ModuloSistema.FINANCEIRO)
@Controller('financeiro/contatos')
export class ContatosController {
  constructor(private contatosService: ContatosService) {}

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.VER)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado, @Query('tipo') tipo?: TipoContato) {
    return this.contatosService.listar(user.empresaAtivaId!, tipo);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarContatoDto) {
    return this.contatosService.criar(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Patch(':id')
  atualizar(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarContatoDto,
  ) {
    return this.contatosService.atualizar(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Delete(':id')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.contatosService.remover(user.empresaAtivaId!, id);
  }
}
