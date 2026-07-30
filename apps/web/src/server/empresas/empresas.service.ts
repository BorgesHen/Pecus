import { NotFoundException } from '@nestjs/common';
import { PapelUsuario, CHAVES_CAMPOS_CONFIGURAVEIS, CHAVES_RECURSOS_PERSONALIZADOS } from '@pecus/shared';
import { prisma } from '../prisma';
import type {
  CriarEmpresaDto,
  AtualizarEmpresaDto,
  AtualizarConfiguracaoEmpresaDto,
  AtualizarRecursosPersonalizadosDto,
} from './dto';

const CAMPOS_CONFIGURACAO = {
  moduloLotesAtivo: true,
  moduloGastosAtivo: true,
  moduloRelatoriosAtivo: true,
  moduloAnimaisAtivo: true,
  moduloSanidadeAtivo: true,
  moduloReproducaoAtivo: true,
  moduloEstoqueAtivo: true,
  moduloMetodosManejoAtivo: true,
  moduloAreasAtivo: true,
  moduloFinanceiroAtivo: true,
  rendimentoCarcacaPadrao: true,
  sanidadeDiasAvisoVencimento: true,
  alturaIdealPastoPadrao: true,
  camposDesativados: true,
  recursosPersonalizados: true,
} as const;

/** O Prisma guarda `camposDesativados`/`recursosPersonalizados` como Json; aqui eles sempre são array de strings. */
function comoCamposDesativados<T extends { camposDesativados: unknown; recursosPersonalizados: unknown }>(
  empresa: T,
): Omit<T, 'camposDesativados' | 'recursosPersonalizados'> & {
  camposDesativados: string[];
  recursosPersonalizados: string[];
} {
  return {
    ...empresa,
    camposDesativados: (empresa.camposDesativados as string[]) ?? [],
    recursosPersonalizados: (empresa.recursosPersonalizados as string[]) ?? [],
  };
}

/** ADMIN vê todas; demais só as empresas em que estão vinculados. */
export function listar(usuarioId: string, papelGlobal: PapelUsuario) {
  if (papelGlobal === PapelUsuario.ADMIN) {
    return prisma.empresa.findMany({ orderBy: { createdAt: 'desc' } });
  }
  return prisma.empresa.findMany({
    where: { usuarios: { some: { usuarioId } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function detalhar(id: string) {
  const empresa = await prisma.empresa.findUnique({
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
export function criar(dto: CriarEmpresaDto) {
  return prisma.empresa.create({ data: dto });
}

export async function atualizar(id: string, dto: AtualizarEmpresaDto) {
  await detalhar(id);
  return prisma.empresa.update({ where: { id }, data: dto });
}

/**
 * Painel de Configurações: módulos ativos + valores-padrão da fazenda.
 * Sempre escopado pela empresaAtivaId do próprio usuário — nunca recebe um
 * id arbitrário do cliente.
 */
export async function obterConfiguracao(empresaId: string) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: CAMPOS_CONFIGURACAO,
  });
  if (!empresa) throw new NotFoundException('Empresa não encontrada.');
  return comoCamposDesativados(empresa);
}

/** Só as chaves conhecidas ("tela.campo") em TELAS_CAMPOS_CONFIGURAVEIS — descarta lixo enviado pelo cliente. */
function filtrarChavesConhecidas(chaves: string[]): string[] {
  return chaves.filter((chave) => CHAVES_CAMPOS_CONFIGURAVEIS.includes(chave));
}

export async function atualizarConfiguracao(empresaId: string, dto: AtualizarConfiguracaoEmpresaDto) {
  const empresa = await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      ...dto,
      camposDesativados: dto.camposDesativados ? filtrarChavesConhecidas(dto.camposDesativados) : undefined,
    },
    select: CAMPOS_CONFIGURACAO,
  });
  return comoCamposDesativados(empresa);
}

/** Usado pelos services de cadastro pra saber quais campos opcionais ignorar ao salvar. */
export async function obterCamposDesativados(empresaId: string): Promise<string[]> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { camposDesativados: true },
  });
  return (empresa?.camposDesativados as string[]) ?? [];
}

/**
 * Vincula um usuário existente a uma empresa. Função exclusiva do ADMIN,
 * pois liberar outras fazendas para um usuário não é papel do responsável.
 */
export async function vincularUsuario(empresaId: string, usuarioId: string, papel: PapelUsuario) {
  return prisma.usuarioEmpresa.upsert({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    update: { papel },
    create: { usuarioId, empresaId, papel },
  });
}

/**
 * Tela "Recursos personalizados": recursos sob encomenda liberados só pra
 * uma fazenda específica. Função exclusiva do ADMIN — o próprio responsável
 * nem sabe que essa lista existe.
 */
export async function atualizarRecursosPersonalizados(empresaId: string, dto: AtualizarRecursosPersonalizadosDto) {
  await detalhar(empresaId);
  const recursosValidos = dto.recursos.filter((chave) => CHAVES_RECURSOS_PERSONALIZADOS.includes(chave));
  const empresa = await prisma.empresa.update({
    where: { id: empresaId },
    data: { recursosPersonalizados: recursosValidos },
    select: CAMPOS_CONFIGURACAO,
  });
  return comoCamposDesativados(empresa);
}
