import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { PapelUsuario, UsuarioAutenticado } from '@pecus/shared';
import { MetodosManejoService } from './metodos-manejo.service';
import { CriarMetodoManejoDto } from './dto/metodo-manejo.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('metodos-manejo')
export class MetodosManejoController {
  constructor(private service: MetodosManejoService) {}

  @Get()
  listar(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.listar(user.empresaAtivaId!);
  }

  // Cadastrar/remover métodos customizados: responsável da fazenda
  @Roles(PapelUsuario.RESPONSAVEL)
  @Post()
  criar(@CurrentUser() user: UsuarioAutenticado, @Body() dto: CriarMetodoManejoDto) {
    return this.service.criar(user.empresaAtivaId!, dto);
  }

  @Roles(PapelUsuario.RESPONSAVEL)
  @Delete(':id')
  remover(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.service.remover(user.empresaAtivaId!, id);
  }
}
