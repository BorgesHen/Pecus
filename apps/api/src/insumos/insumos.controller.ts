import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, UsuarioAutenticado } from '@pecus/shared';
import { InsumosService } from './insumos.service';
import { CriarInsumoDto, AtualizarInsumoDto, RegistrarConsumoDto } from './dto/insumo.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ModuloAtivo } from '../common/decorators/modulo-ativo.decorator';
import { Permissao } from '../common/decorators/permissao.decorator';

@ModuloAtivo(ModuloSistema.ESTOQUE)
@Controller('insumos')
export class InsumosController {
  constructor(private insumosService: InsumosService) {}

  @Permissao(ModuloSistema.ESTOQUE, NivelAcesso.VER)
  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.insumosService.listar(user.empresaAtivaId!);
  }

  @Permissao(ModuloSistema.ESTOQUE, NivelAcesso.VER)
  @Get(':id')
  detalhar(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.insumosService.detalhar(user.empresaAtivaId!, id);
  }

  @Permissao(ModuloSistema.ESTOQUE, NivelAcesso.VER)
  @Get(':id/movimentos')
  listarMovimentos(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.insumosService.listarMovimentos(user.empresaAtivaId!, id);
  }

  @Permissao(ModuloSistema.ESTOQUE, NivelAcesso.EDITAR)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarInsumoDto) {
    return this.insumosService.criar(user.empresaAtivaId!, dto);
  }

  @Permissao(ModuloSistema.ESTOQUE, NivelAcesso.EDITAR)
  @Patch(':id')
  atualizar(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: AtualizarInsumoDto,
  ) {
    return this.insumosService.atualizar(user.empresaAtivaId!, id, dto);
  }

  @Permissao(ModuloSistema.ESTOQUE, NivelAcesso.EDITAR)
  @Post(':id/consumir')
  registrarConsumo(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: RegistrarConsumoDto,
  ) {
    return this.insumosService.registrarConsumo(user.empresaAtivaId!, id, dto);
  }
}
