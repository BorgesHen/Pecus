export interface Empresa {
  id: string;
  nome: string;
  documento?: string | null; // CPF ou CNPJ
  createdAt: string;
}
