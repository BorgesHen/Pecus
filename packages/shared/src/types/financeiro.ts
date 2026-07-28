import type { NaturezaFinanceira, FormaPagamento, TipoContato } from '../enums/financeiro';

export interface ContaFinanceira {
  id: string;
  grupoId: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

export interface GrupoFinanceiro {
  id: string;
  empresaId: string;
  natureza: NaturezaFinanceira;
  codigo: string;
  nome: string;
  ordem: number;
}

export interface ContaBancaria {
  id: string;
  empresaId: string;
  nome: string;
  saldoInicial: number;
  dataSaldoInicial?: string | null;
  ativo: boolean;
}

export interface Contato {
  id: string;
  empresaId: string;
  tipo: TipoContato;
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface Lancamento {
  id: string;
  empresaId: string;
  contaId: string;
  loteId?: string | null; // "projeto" — null = geral/consolidado da fazenda
  contatoId?: string | null;
  contaBancariaId?: string | null;
  formaPagamento?: FormaPagamento | null;
  descricao?: string | null;
  documento?: string | null;
  valorTotal: number;
  totalParcelas: number;
  numeroParcela: number;
  valorParcela: number;
  dataDocumento: string;
  dataVencimento: string;
  dataLiquidacao?: string | null;
}
