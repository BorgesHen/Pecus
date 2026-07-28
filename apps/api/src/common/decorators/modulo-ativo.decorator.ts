import { SetMetadata } from '@nestjs/common';
import { ModuloSistema } from '@pecus/shared';

export const MODULO_ATIVO_KEY = 'moduloAtivo';

/**
 * Exige que o módulo esteja ativado para a empresa (painel de Configurações).
 * Diferente de @Permissao — aqui a checagem é por FAZENDA, não por usuário.
 * Ex: @ModuloAtivo(ModuloSistema.SANIDADE)
 */
export const ModuloAtivo = (modulo: ModuloSistema) => SetMetadata(MODULO_ATIVO_KEY, modulo);
