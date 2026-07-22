import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PapelUsuario } from '@pecus/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CriarUsuarioDto, AtualizarPermissoesDto } from './dto/usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  /** Lista os usuários vinculados à empresa (visão do responsável). */
  listarDaEmpresa(empresaId: string) {
    return this.prisma.usuarioEmpresa.findMany({
      where: { empresaId },
      include: { usuario: { select: { id: true, nome: true, email: true, createdAt: true } } },
    });
  }

  /**
   * Cria um usuário na empresa ativa. O responsável NÃO pode criar ADMIN
   * (liberar acesso global é função exclusiva do admin do sistema).
   */
  async criarNaEmpresa(empresaId: string, dto: CriarUsuarioDto) {
    const papel = dto.papel ?? PapelUsuario.USUARIO;
    if (papel === PapelUsuario.ADMIN) {
      throw new BadRequestException('Responsável não pode criar usuário ADMIN.');
    }

    return this.prisma.$transaction(async (tx) => {
      let usuario = await tx.usuario.findUnique({ where: { email: dto.email } });

      if (!usuario) {
        usuario = await tx.usuario.create({
          data: {
            nome: dto.nome,
            email: dto.email,
            senhaHash: await bcrypt.hash(dto.senha, 10),
            papelGlobal: papel,
          },
        });
      }

      const jaVinculado = await tx.usuarioEmpresa.findUnique({
        where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId } },
      });
      if (jaVinculado) {
        throw new BadRequestException('Usuário já vinculado a esta empresa.');
      }

      return tx.usuarioEmpresa.create({
        data: {
          usuarioId: usuario.id,
          empresaId,
          papel,
          permissoes: dto.permissoes ?? {},
        },
      });
    });
  }

  /** Atualiza permissões granulares de um usuário dentro da empresa. */
  async atualizarPermissoes(empresaId: string, usuarioId: string, dto: AtualizarPermissoesDto) {
    const vinculo = await this.prisma.usuarioEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId, empresaId } },
    });
    if (!vinculo) throw new NotFoundException('Usuário não vinculado a esta empresa.');

    return this.prisma.usuarioEmpresa.update({
      where: { usuarioId_empresaId: { usuarioId, empresaId } },
      data: { permissoes: dto.permissoes },
    });
  }

  /** Remove o vínculo do usuário com a empresa (não apaga a conta dele). */
  async removerDaEmpresa(empresaId: string, usuarioId: string) {
    await this.prisma.usuarioEmpresa.deleteMany({ where: { empresaId, usuarioId } });
    return { ok: true };
  }
}
