import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PapelUsuario as PapelUsuarioPrisma } from '@prisma/client';
import { PapelUsuario } from '@pecus/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegistrarDto } from './dto/auth.dto';
import { PLANO_CONTAS_PADRAO } from '../financeiro/plano-contas-padrao';

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
    const [usuariosConflitantes, empresaConflitante] = await Promise.all([
      this.prisma.usuario.findMany({
        where: { OR: [{ email: dto.email }, { usuario: dto.usuario }] },
      }),
      this.prisma.empresa.findFirst({
        where: { nome: { equals: dto.nomeEmpresa, mode: 'insensitive' } },
      }),
    ]);

    const conflitos: string[] = [];
    if (usuariosConflitantes.some((u) => u.email === dto.email)) {
      conflitos.push('E-mail já cadastrado. Use outro e-mail para continuar.');
    }
    if (usuariosConflitantes.some((u) => u.usuario === dto.usuario)) {
      conflitos.push('Usuário já em uso. Escolha outro nome de usuário.');
    }
    if (empresaConflitante) {
      conflitos.push('Nome da fazenda já cadastrado. Escolha um nome diferente.');
    }
    if (conflitos.length > 0) {
      throw new ConflictException(conflitos);
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nome: dto.nome,
          email: dto.email,
          usuario: dto.usuario,
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

      for (const grupo of PLANO_CONTAS_PADRAO) {
        await tx.grupoFinanceiro.create({
          data: {
            empresaId: empresa.id,
            natureza: grupo.natureza,
            codigo: grupo.codigo,
            nome: grupo.nome,
            ordem: grupo.ordem,
            contas: { create: grupo.contas },
          },
        });
      }

      return { usuario, empresa };
    });

    return this.gerarToken(resultado.usuario, resultado.empresa.id);
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuario: dto.usuario },
      include: { empresas: true },
    });

    if (!usuario || !(await bcrypt.compare(dto.senha, usuario.senhaHash))) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Seleciona a primeira empresa como ativa (o front pode trocar depois)
    const empresaAtivaId = usuario.empresas[0]?.empresaId;
    return this.gerarToken(usuario, empresaAtivaId);
  }

  /** Reemite o token com outra empresaAtivaId — só se o usuário tiver vínculo com ela (ou for ADMIN). */
  async trocarEmpresa(usuarioId: string, empresaId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new UnauthorizedException('Sessão inválida.');

    if (usuario.papelGlobal === PapelUsuario.ADMIN) {
      const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
      if (!empresa) throw new NotFoundException('Empresa não encontrada.');
    } else {
      const vinculo = await this.prisma.usuarioEmpresa.findUnique({
        where: { usuarioId_empresaId: { usuarioId, empresaId } },
      });
      if (!vinculo) throw new ForbiddenException('Você não tem acesso a esta empresa.');
    }

    return this.gerarToken(usuario, empresaId);
  }

  private gerarToken(
    usuario: { id: string; email: string; nome: string; papelGlobal: PapelUsuarioPrisma },
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
