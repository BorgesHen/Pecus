import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PapelUsuario, UsuarioAutenticado } from '@pecus/shared';
import { EmpresasService } from './empresas.service';
import {
  CriarEmpresaDto,
  AtualizarEmpresaDto,
  AtualizarConfiguracaoEmpresaDto,
} from './dto/empresa.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('empresas')
export class EmpresasController {
  constructor(private empresasService: EmpresasService) {}

  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.empresasService.listar(user.id, user.papelGlobal);
  }

  // Precisam vir ANTES de @Get(':id')/@Patch(':id') — senão ':id' captura
  // "configuracao" como se fosse um id de empresa.
  @Get('configuracao')
  obterConfiguracao(@CurrentUser() user: UsuarioAutenticado) {
    return this.empresasService.obterConfiguracao(user.empresaAtivaId!);
  }

  @Roles(PapelUsuario.RESPONSAVEL)
  @Patch('configuracao')
  atualizarConfiguracao(
    @CurrentUser() user: UsuarioAutenticado,
    @Body() dto: AtualizarConfiguracaoEmpresaDto,
  ) {
    return this.empresasService.atualizarConfiguracao(user.empresaAtivaId!, dto);
  }

  @Get(':id')
  detalhar(@Param('id') id: string) {
    return this.empresasService.detalhar(id);
  }

  // Criar empresa avulsa e vincular usuários a outras fazendas = só ADMIN
  @Roles(PapelUsuario.ADMIN)
  @Post()
  criar(@Body() dto: CriarEmpresaDto) {
    return this.empresasService.criar(dto);
  }

  @Roles(PapelUsuario.ADMIN)
  @Post(':id/vincular-usuario')
  vincular(
    @Param('id') empresaId: string,
    @Body() body: { usuarioId: string; papel: PapelUsuario },
  ) {
    return this.empresasService.vincularUsuario(empresaId, body.usuarioId, body.papel);
  }

  // Editar dados da própria fazenda: responsável pode
  @Roles(PapelUsuario.RESPONSAVEL)
  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarEmpresaDto) {
    return this.empresasService.atualizar(id, dto);
  }
}
