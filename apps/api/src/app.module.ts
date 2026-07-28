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
import { AnimaisModule } from './animais/animais.module';
import { SanidadeModule } from './sanidade/sanidade.module';
import { ReproducaoModule } from './reproducao/reproducao.module';
import { InsumosModule } from './insumos/insumos.module';
import { PiquetesModule } from './piquetes/piquetes.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ModuloAtivoGuard } from './common/guards/modulo-ativo.guard';
import { PermissoesGuard } from './common/guards/permissoes.guard';

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
    AnimaisModule,
    SanidadeModule,
    ReproducaoModule,
    InsumosModule,
    PiquetesModule,
  ],
  providers: [
    // JWT protege tudo por padrão (use @Public() para abrir rotas)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Checagem de papel/permissão roda depois da autenticação
    { provide: APP_GUARD, useClass: RolesGuard },
    // Módulo ativo/inativo por fazenda (painel de Configurações)
    { provide: APP_GUARD, useClass: ModuloAtivoGuard },
    // Permissão granular por usuário (VER/EDITAR por módulo) — usa @Permissao()
    { provide: APP_GUARD, useClass: PermissoesGuard },
  ],
})
export class AppModule {}
