import { Injectable, NotFoundException } from '@nestjs/common';
import { PapelUsuario } from '@pecus/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEmpresaDto, AtualizarEmpresaDto } from './dto/empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(private prisma: PrismaService) {}

  /** ADMIN vê todas; demais só as empresas em que estão vinculados. */
  listar(usuarioId: string, papelGlobal: PapelUsuario) {
    if (papelGlobal === PapelUsuario.ADMIN) {
      return this.prisma.empresa.findMany({ orderBy: { createdAt: 'desc' } });
    }
    return this.prisma.empresa.findMany({
      where: { usuarios: { some: { usuarioId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detalhar(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      include: {
        usuarios: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
      },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada.');
    return empresa;
  }

  /**
   * Criação de empresa "solta". Só o ADMIN faz isso (liberar novas fazendas é
   * função exclusiva dele). O fluxo normal de nova fazenda é via /auth/registrar.
   */
  criar(dto: CriarEmpresaDto) {
    return this.prisma.empresa.create({ data: dto });
  }

  async atualizar(id: string, dto: AtualizarEmpresaDto) {
    await this.detalhar(id);
    return this.prisma.empresa.update({ where: { id }, data: dto });
  }

  /**
   * Vincula um usuário existente a uma empresa. Função exclusiva do ADMIN,
   * pois liberar outras fazendas para um usuário não é papel do responsável.
   */
  async vincularUsuario(empresaId: string, usuarioId: string, papel: PapelUsuario) {
    return this.prisma.usuarioEmpresa.upsert({
      where: { usuarioId_empresaId: { usuarioId, empresaId } },
      update: { papel },
      create: { usuarioId, empresaId, papel },
    });
  }
}
