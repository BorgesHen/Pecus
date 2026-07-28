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
  rendimentoCarcacaPadrao: number;
  sanidadeDiasAvisoVencimento: number;
  camposDesativados: string[];
}
