export interface Empresa {
  id: string;
  nome: string;
  documento?: string | null; // CPF ou CNPJ
  createdAt: string;
  moduloAnimaisAtivo: boolean;
  moduloSanidadeAtivo: boolean;
  moduloReproducaoAtivo: boolean;
  moduloEstoqueAtivo: boolean;
  moduloMetodosManejoAtivo: boolean;
  moduloAreasAtivo: boolean;
  moduloFinanceiroAtivo: boolean;
  rendimentoCarcacaPadrao: number;
  sanidadeDiasAvisoVencimento: number;
  alturaIdealPastoPadrao: number;
  camposDesativados: string[];
  recursosPersonalizados: string[];
}
