import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegistrarDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsuarioAutenticado } from '@pecus/shared';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('registrar')
  registrar(@Body() dto: RegistrarDto) {
    return this.authService.registrar(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Retorna os dados do usuário logado (útil pro front validar a sessão). */
  @Get('me')
  me(@CurrentUser() user: UsuarioAutenticado) {
    return user;
  }
}
