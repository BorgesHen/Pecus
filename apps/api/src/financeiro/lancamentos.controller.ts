import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ModuloSistema, NaturezaFinanceira, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';
import { LancamentosService } from './lancamentos.service';
import { CriarLancamentoDto, LiquidarLancamentoDto } from './dto/lancamento.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@ModuloAtivo(ModuloSistema.FINANCEIRO)
@Controller('financeiro')
export class LancamentosController {
  constructor(private lancamentosService: LancamentosService) {}

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.VER)
  @Get('lancamentos')
  listar(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('natureza') natureza?: NaturezaFinanceira,
    @Query('loteId') loteId?: string,
    @Query('contaId') contaId?: string,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
    @Query('status') status?: 'aberto' | 'liquidado',
  ) {
    return this.lancamentosService.listar(user.empresaAtivaId!, {
      natureza,
      loteId,
      contaId,
      de,
      ate,
      status,
    });
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.VER)
  @Get('contas-pagar')
  contasAPagar(@CurrentUser() user: UsuarioAutenticado) {
    return this.lancamentosService.contasAPagar(user.empresaAtivaId!);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.VER)
  @Get('contas-receber')
  contasAReceber(@CurrentUser() user: UsuarioAutenticado) {
    return this.lancamentosService.contasAReceber(user.empresaAtivaId!);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Post('lancamentos')
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarLancamentoDto) {
    return this.lancamentosService.criar(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Patch('lancamentos/:id/liquidar')
  liquidar(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: LiquidarLancamentoDto,
  ) {
    return this.lancamentosService.liquidar(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Delete('lancamentos/:id')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.lancamentosService.remover(user.empresaAtivaId!, id);
  }
}
