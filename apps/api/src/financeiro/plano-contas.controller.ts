import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';
import { PlanoContasService } from './plano-contas.service';
import { CriarGrupoFinanceiroDto, AtualizarGrupoFinanceiroDto } from './dto/grupo-financeiro.dto';
import { CriarContaFinanceiraDto, AtualizarContaFinanceiraDto } from './dto/conta-financeira.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@ModuloAtivo(ModuloSistema.FINANCEIRO)
@Controller('financeiro')
export class PlanoContasController {
  constructor(private planoContasService: PlanoContasService) {}

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.VER)
  @Get('plano-contas')
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.planoContasService.listar(user.empresaAtivaId!);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Post('grupos')
  criarGrupo(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarGrupoFinanceiroDto) {
    return this.planoContasService.criarGrupo(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Patch('grupos/:id')
  atualizarGrupo(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarGrupoFinanceiroDto,
  ) {
    return this.planoContasService.atualizarGrupo(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Delete('grupos/:id')
  removerGrupo(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.planoContasService.removerGrupo(user.empresaAtivaId!, id);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Post('contas')
  criarConta(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarContaFinanceiraDto) {
    return this.planoContasService.criarConta(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Patch('contas/:id')
  atualizarConta(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarContaFinanceiraDto,
  ) {
    return this.planoContasService.atualizarConta(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Delete('contas/:id')
  removerConta(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.planoContasService.removerConta(user.empresaAtivaId!, id);
  }
}
