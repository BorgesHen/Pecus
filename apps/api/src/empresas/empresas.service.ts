import { Injectable, NotFoundException } from '@nestjs/common';
import { PapelUsuario, CHAVES_CAMPOS_CONFIGURAVEIS } from '@pecus/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEmpresaDto, AtualizarEmpresaDto, AtualizarConfiguracaoEmpresaDto } from './dto/empresa.dto';

const CAMPOS_CONFIGURACAO = {
  moduloAnimaisAtivo: true,
  moduloSanidadeAtivo: true,
  moduloReproducaoAtivo: true,
  moduloEstoqueAtivo: true,
  moduloMetodosManejoAtivo: true,
  rendimentoCarcacaPadrao: true,
  sanidadeDiasAvisoVencimento: true,
  camposDesativados: true,
} as const;

/** O Prisma guarda `camposDesativados` como Json; aqui ele sempre é um array de strings. */
function comoCamposDesativados<T extends { camposDesativados: unknown }>(
  empresa: T,
): Omit<T, 'camposDesativados'> & { camposDesativados: string[] } {
  return { ...empresa, camposDesativados: (empresa.camposDesativados as string[]) ?? [] };
}

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
   * Painel de Configurações: módulos ativos + valores-padrão da fazenda.
   * Sempre escopado pela empresaAtivaId do próprio usuário — nunca recebe um
   * id arbitrário do cliente.
   */
  async obterConfiguracao(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: CAMPOS_CONFIGURACAO,
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada.');
    return comoCamposDesativados(empresa);
  }

  /** Só as chaves conhecidas ("tela.campo") em TELAS_CAMPOS_CONFIGURAVEIS — descarta lixo enviado pelo cliente. */
  private filtrarChavesConhecidas(chaves: string[]): string[] {
    return chaves.filter((chave) => CHAVES_CAMPOS_CONFIGURAVEIS.includes(chave));
  }

  async atualizarConfiguracao(empresaId: string, dto: AtualizarConfiguracaoEmpresaDto) {
    const empresa = await this.prisma.empresa.update({
      where: { id: empresaId },
      data: {
        ...dto,
        camposDesativados: dto.camposDesativados
          ? this.filtrarChavesConhecidas(dto.camposDesativados)
          : undefined,
      },
      select: CAMPOS_CONFIGURACAO,
    });
    return comoCamposDesativados(empresa);
  }

  /** Usado pelos services de cadastro pra saber quais campos opcionais ignorar ao salvar. */
  async obterCamposDesativados(empresaId: string): Promise<string[]> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { camposDesativados: true },
    });
    return (empresa?.camposDesativados as string[]) ?? [];
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
