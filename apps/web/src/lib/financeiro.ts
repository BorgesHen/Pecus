import { api } from './api';
import type {
  GrupoFinanceiro,
  ContaFinanceira,
  ContaBancaria,
  Contato,
  Lancamento,
  NaturezaFinanceira,
  FormaPagamento,
  TipoContato,
  StatusLancamento,
} from '@pecus/shared';

export interface GrupoComContas extends GrupoFinanceiro {
  contas: ContaFinanceira[];
}

export interface LancamentoDetalhado extends Lancamento {
  conta: ContaFinanceira & { grupo: GrupoFinanceiro };
  lote?: { id: string; identificacao: string } | null;
  contato?: Contato | null;
  contaBancaria?: ContaBancaria | null;
  status: StatusLancamento;
}

export interface NovoGrupoFinanceiro {
  natureza: NaturezaFinanceira;
  codigo: string;
  nome: string;
  ordem?: number;
}

export interface ParametrosGrupoFinanceiro {
  nome?: string;
  ordem?: number;
}

export interface NovaContaFinanceira {
  grupoId: string;
  codigo: string;
  nome: string;
}

export interface ParametrosContaFinanceira {
  nome?: string;
  ativo?: boolean;
}

export interface NovaContaBancaria {
  nome: string;
  saldoInicial?: number;
  dataSaldoInicial?: string;
}

export interface ParametrosContaBancaria {
  nome?: string;
  saldoInicial?: number;
  dataSaldoInicial?: string;
  ativo?: boolean;
}

export interface NovoContato {
  tipo: TipoContato;
  nome: string;
  documento?: string;
  telefone?: string;
  email?: string;
}

export interface ParametrosContato {
  tipo?: TipoContato;
  nome?: string;
  documento?: string;
  telefone?: string;
  email?: string;
}

export interface NovoLancamento {
  contaId: string;
  loteId?: string;
  contatoId?: string;
  contaBancariaId?: string;
  formaPagamento?: FormaPagamento;
  descricao?: string;
  documento?: string;
  valorTotal: number;
  totalParcelas?: number;
  dataDocumento: string;
  dataVencimento: string;
  dataLiquidacao?: string;
}

export interface LiquidarLancamento {
  dataLiquidacao: string;
  contaBancariaId?: string;
}

export interface FiltrosLancamento {
  natureza?: NaturezaFinanceira;
  loteId?: string;
  contaId?: string;
  de?: string;
  ate?: string;
  status?: 'aberto' | 'liquidado';
}

// Plano de contas

export function listarPlanoContas() {
  return api<GrupoComContas[]>('/financeiro/plano-contas');
}

export function criarGrupoFinanceiro(dados: NovoGrupoFinanceiro) {
  return api<GrupoFinanceiro>('/financeiro/grupos', { method: 'POST', body: dados });
}

export function atualizarGrupoFinanceiro(id: string, dados: ParametrosGrupoFinanceiro) {
  return api<GrupoFinanceiro>(`/financeiro/grupos/${id}`, { method: 'PATCH', body: dados });
}

export function removerGrupoFinanceiro(id: string) {
  return api<{ ok: true }>(`/financeiro/grupos/${id}`, { method: 'DELETE' });
}

export function criarContaFinanceira(dados: NovaContaFinanceira) {
  return api<ContaFinanceira>('/financeiro/contas', { method: 'POST', body: dados });
}

export function atualizarContaFinanceira(id: string, dados: ParametrosContaFinanceira) {
  return api<ContaFinanceira>(`/financeiro/contas/${id}`, { method: 'PATCH', body: dados });
}

export function removerContaFinanceira(id: string) {
  return api<{ ok: true }>(`/financeiro/contas/${id}`, { method: 'DELETE' });
}

// Bancos

export function listarBancos() {
  return api<ContaBancaria[]>('/financeiro/bancos');
}

export function criarBanco(dados: NovaContaBancaria) {
  return api<ContaBancaria>('/financeiro/bancos', { method: 'POST', body: dados });
}

export function atualizarBanco(id: string, dados: ParametrosContaBancaria) {
  return api<ContaBancaria>(`/financeiro/bancos/${id}`, { method: 'PATCH', body: dados });
}

export function removerBanco(id: string) {
  return api<{ ok: true }>(`/financeiro/bancos/${id}`, { method: 'DELETE' });
}

// Contatos

export function listarContatos(tipo?: TipoContato) {
  const q = tipo ? `?tipo=${tipo}` : '';
  return api<Contato[]>(`/financeiro/contatos${q}`);
}

export function criarContato(dados: NovoContato) {
  return api<Contato>('/financeiro/contatos', { method: 'POST', body: dados });
}

export function atualizarContato(id: string, dados: ParametrosContato) {
  return api<Contato>(`/financeiro/contatos/${id}`, { method: 'PATCH', body: dados });
}

export function removerContato(id: string) {
  return api<{ ok: true }>(`/financeiro/contatos/${id}`, { method: 'DELETE' });
}

// Lançamentos

export function listarLancamentos(filtros: FiltrosLancamento = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor) params.set(chave, valor);
  });
  const q = params.toString();
  return api<LancamentoDetalhado[]>(`/financeiro/lancamentos${q ? `?${q}` : ''}`);
}

export function listarContasAPagar() {
  return api<LancamentoDetalhado[]>('/financeiro/contas-pagar');
}

export function listarContasAReceber() {
  return api<LancamentoDetalhado[]>('/financeiro/contas-receber');
}

export function criarLancamento(dados: NovoLancamento) {
  return api<Lancamento>('/financeiro/lancamentos', { method: 'POST', body: dados });
}

export function liquidarLancamento(id: string, dados: LiquidarLancamento) {
  return api<Lancamento>(`/financeiro/lancamentos/${id}/liquidar`, { method: 'PATCH', body: dados });
}

export function removerLancamento(id: string) {
  return api<{ ok: true }>(`/financeiro/lancamentos/${id}`, { method: 'DELETE' });
}
