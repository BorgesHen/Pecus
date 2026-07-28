/** Área de pasto — separada do Lote (que é só organização de animais). */
export interface Area {
  id: string;
  empresaId: string;
  nome: string;
  areaHectares?: number | null;
  createdAt: string;
}
