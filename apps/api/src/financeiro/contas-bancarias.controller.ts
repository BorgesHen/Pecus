import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';
import { ContasBancariasService } from './contas-bancarias.service';
import { CriarContaBancariaDto, AtualizarContaBancariaDto } from './dto/conta-bancaria.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@ModuloAtivo(ModuloSistema.FINANCEIRO)
@Controller('financeiro/bancos')
export class ContasBancariasController {
  constructor(private contasBancariasService: ContasBancariasService) {}

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.VER)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.contasBancariasService.listar(user.empresaAtivaId!);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarContaBancariaDto) {
    return this.contasBancariasService.criar(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Patch(':id')
  atualizar(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarContaBancariaDto,
  ) {
    return this.contasBancariasService.atualizar(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.FINANCEIRO, NivelAcesso.EDITAR)
  @Delete(':id')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.contasBancariasService.remover(user.empresaAtivaId!, id);
  }
}
