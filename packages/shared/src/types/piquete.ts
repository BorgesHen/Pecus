/** Subdivisão da área de pasto (pastejo rotacionado). */
export interface Piquete {
  id: string;
  areaId: string;
  nome: string;
  areaHectares?: number | null;
  /** Override por piquete; se nulo, usa Empresa.alturaIdealPastoPadrao. */
  alturaIdealCm?: number | null;
  createdAt: string;
}

/** Medição da altura do capim num piquete ("controle do pasto"). */
export interface RegistroAlturaPasto {
  id: string;
  piqueteId: string;
  data: string;
  alturaCm: number;
  createdAt: string;
}

/** Fase em que o piquete concentrou o gado da área. dataFim nula = ocupado agora. */
export interface OcupacaoPiquete {
  id: string;
  piqueteId: string;
  dataInicio: string;
  dataFim?: string | null;
}
