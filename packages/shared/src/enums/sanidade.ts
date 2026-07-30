export enum TipoEventoSanitario {
  VACINA = 'VACINA',
  MEDICAMENTO = 'MEDICAMENTO',
  EXAME = 'EXAME',
  /** Avaliação de escores (FAMACHA / condição corporal) — usada no manejo ovino. */
  AVALIACAO = 'AVALIACAO',
  OUTRO = 'OUTRO',
}

export const LABEL_TIPO_EVENTO_SANITARIO: Record<TipoEventoSanitario, string> = {
  [TipoEventoSanitario.VACINA]: 'Vacina',
  [TipoEventoSanitario.MEDICAMENTO]: 'Medicamento',
  [TipoEventoSanitario.EXAME]: 'Exame',
  [TipoEventoSanitario.AVALIACAO]: 'Avaliação (FAMACHA / ECC)',
  [TipoEventoSanitario.OUTRO]: 'Outro',
};

/**
 * Método FAMACHA© — avalia a cor da mucosa ocular do ovino numa escala de 1 a 5
 * pra estimar anemia causada por verminose (principalmente Haemonchus
 * contortus). Serve pra vermifugar seletivamente só os animais que precisam,
 * em vez do rebanho inteiro: além de economizar vermífugo, reduz a pressão de
 * seleção que gera parasitas resistentes.
 *
 * Grau 1-2 = não trata. Grau 3 = atenção (tratar conforme condição corporal).
 * Grau 4-5 = tratar imediatamente.
 */
export const FAMACHA_GRAU_MINIMO = 1;
export const FAMACHA_GRAU_MAXIMO = 5;
/** A partir deste grau o animal entra no alerta de vermifugação. */
export const FAMACHA_GRAU_ALERTA = 3;

export interface GrauFamacha {
  grau: number;
  label: string;
  descricao: string;
  /** Conduta recomendada — exibida junto do escore. */
  conduta: string;
}

export const GRAUS_FAMACHA: GrauFamacha[] = [
  {
    grau: 1,
    label: '1 — Vermelho robusto',
    descricao: 'Mucosa vermelha, sem sinal de anemia.',
    conduta: 'Não vermifugar.',
  },
  {
    grau: 2,
    label: '2 — Vermelho rosado',
    descricao: 'Mucosa levemente mais clara, sem anemia relevante.',
    conduta: 'Não vermifugar.',
  },
  {
    grau: 3,
    label: '3 — Rosa',
    descricao: 'Anemia leve — zona de atenção.',
    conduta: 'Avaliar junto da condição corporal; tratar se o animal estiver magro.',
  },
  {
    grau: 4,
    label: '4 — Rosa esbranquiçado',
    descricao: 'Anemia clara.',
    conduta: 'Vermifugar.',
  },
  {
    grau: 5,
    label: '5 — Branco (porcelana)',
    descricao: 'Anemia grave, risco de morte.',
    conduta: 'Vermifugar imediatamente e reforçar nutrição.',
  },
];

/**
 * Escore de Condição Corporal (ECC) de ovinos: escala de 1 (caquético) a 5
 * (obeso), avaliada pela cobertura de músculo/gordura sobre a coluna lombar.
 * Aceita meio ponto (ex: 2.5). O ideal na cobertura fica entre 3 e 4.
 */
export const ECC_MINIMO = 1;
export const ECC_MAXIMO = 5;
/** Abaixo deste escore o animal é considerado magro (entra no alerta junto com FAMACHA 3). */
export const ECC_ALERTA = 2.5;
