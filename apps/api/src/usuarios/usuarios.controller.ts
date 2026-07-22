import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PapelUsuario, UsuarioAutenticado } from '@pecus/shared';
import { UsuariosService } from './usuarios.service';
import { CriarUsuarioDto, AtualizarPermissoesDto } from './dto/usuario.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

// Gestão de usuários é exclusiva de RESPONSAVEL (e ADMIN, que passa em tudo).
@Roles(PapelUsuario.RESPONSAVEL)
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.usuariosService.listarDaEmpresa(user.empresaAtivaId!);
  }

  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarUsuarioDto) {
    return this.usuariosService.criarNaEmpresa(user.empresaAtivaId!, dto);
  }

  @Patch(':usuarioId/permissoes')
  atualizarPermissoes(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('usuarioId') usuarioId: string,
    @Body() dto: AtualizarPermissoesDto,
  ) {
    return this.usuariosService.atualizarPermissoes(user.empresaAtivaId!, usuarioId, dto);
  }

  @Delete(':usuarioId')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('usuarioId') usuarioId: string) {
    return this.usuariosService.removerDaEmpresa(user.empresaAtivaId!, usuarioId);
  }
}
