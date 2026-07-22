import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PapelUsuario } from '@pecus/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegistrarDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  /**
   * Registro público: cria o usuário como RESPONSAVEL e já cria a fazenda dele,
   * vinculando os dois. É assim que uma nova fazenda entra no sistema.
   */
  async registrar(dto: RegistrarDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nome: dto.nome,
          email: dto.email,
          senhaHash,
          papelGlobal: PapelUsuario.RESPONSAVEL,
        },
      });

      const empresa = await tx.empresa.create({
        data: { nome: dto.nomeEmpresa },
      });

      await tx.usuarioEmpresa.create({
        data: {
          usuarioId: usuario.id,
          empresaId: empresa.id,
          papel: PapelUsuario.RESPONSAVEL,
        },
      });

      return { usuario, empresa };
    });

    return this.gerarToken(resultado.usuario, resultado.empresa.id);
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      include: { empresas: true },
    });

    if (!usuario || !(await bcrypt.compare(dto.senha, usuario.senhaHash))) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Seleciona a primeira empresa como ativa (o front pode trocar depois)
    const empresaAtivaId = usuario.empresas[0]?.empresaId;
    return this.gerarToken(usuario, empresaAtivaId);
  }

  private gerarToken(
    usuario: { id: string; email: string; nome: string; papelGlobal: PapelUsuario },
    empresaAtivaId?: string,
  ) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      papelGlobal: usuario.papelGlobal,
      empresaAtivaId,
    };

    return {
      access_token: this.jwt.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papelGlobal: usuario.papelGlobal,
        empresaAtivaId,
      },
    };
  }
}
