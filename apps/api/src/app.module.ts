import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmpresasModule } from './empresas/empresas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { LotesModule } from './lotes/lotes.module';
import { PesagensModule } from './pesagens/pesagens.module';
import { GastosModule } from './gastos/gastos.module';
import { MetodosManejoModule } from './metodos-manejo/metodos-manejo.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    EmpresasModule,
    UsuariosModule,
    LotesModule,
    PesagensModule,
    GastosModule,
    MetodosManejoModule,
    RelatoriosModule,
  ],
  providers: [
    // JWT protege tudo por padrão (use @Public() para abrir rotas)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Checagem de papel/permissão roda depois da autenticação
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
