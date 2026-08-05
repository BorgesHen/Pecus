import { api } from './api';
import type {
  Lote,
  Area,
  Gasto,
  Pesagem,
  MetodoManejo,
  LoteMetodoHistorico,
  TipoMetodoManejo,
  EspecieAnimal,
  StatusAnimal,
} from '@pecus/shared';

export interface LoteComContagem extends Lote {
  metodoManejo?: MetodoManejo | null;
  _count: { pesagens: number; gastos: number };
}

export interface LoteDetalhado extends Lote {
  metodoManejo?: MetodoManejo | null;
  area?: Area | null;
  pesagens: Pesagem[];
  gastos: Gasto[];
  metodoHistorico: LoteMetodoHistorico[];
}

/** Compra do lote — frete e comissão sempre por cabeça (ver calcularCompraLote). */
export interface DadosCompraLoteApi {
  pesoMedioCompra?: number;
  valorKgCompra?: number;
  fretePorCabeca?: number;
  comissaoPorCabeca?: number;
}

export interface NovoLote extends DadosCompraLoteApi {
  identificacao: string;
  especie?: EspecieAnimal;
  dataAquisicao: string;
  quantidadeAnimais: number;
  pesoMedioEntrada?: number;
  metodoManejoId?: string;
  areaId?: string;
  rendimentoCarcaca?: number;
  gmdEsperado?: number;
}

export interface ParametrosLote extends DadosCompraLoteApi {
  /** O simulador de compra pode corrigir a contagem de cabeças junto do custo. */
  quantidadeAnimais?: number;
  areaId?: string;
  rendimentoCarcaca?: number;
  gmdEsperado?: number;
}

export function listarLotes() {
  return api<LoteComContagem[]>('/lotes');
}

export function obterLote(id: string) {
  return api<LoteDetalhado>(`/lotes/${id}`);
}

export function criarLote(dados: NovoLote) {
  return api<LoteComContagem>('/lotes', { method: 'POST', body: dados });
}

export function atualizarLote(id: string, dados: ParametrosLote) {
  return api<LoteComContagem>(`/lotes/${id}`, { method: 'PATCH', body: dados });
}

export function trocarMetodoLote(id: string, dados: { metodoManejoId: string; dataTroca: string }) {
  return api<LoteComContagem>(`/lotes/${id}/trocar-metodo`, { method: 'POST', body: dados });
}

export function removerLote(id: string) {
  return api<{ ok: true }>(`/lotes/${id}`, { method: 'DELETE' });
}

export function listarMetodosManejo() {
  return api<MetodoManejo[]>('/metodos-manejo');
}

export function criarMetodoManejo(nome: string, tipo: TipoMetodoManejo) {
  return api<MetodoManejo>('/metodos-manejo', { method: 'POST', body: { nome, tipo } });
}

export function removerMetodoManejo(id: string) {
  return api<{ ok: true }>(`/metodos-manejo/${id}`, { method: 'DELETE' });
}

// ----- Acompanhamento do lote (quem falta pesar / quem falta no manejo) -----

/** Animal que está pendente numa rodada. As listas vêm recortadas: `total` é o número real. */
export interface ListaRecortada<T> {
  total: number;
  itens: T[];
}

export interface AnimalPendente {
  id: string;
  identificador: string;
}

export interface ManejoSanitarioDoLote {
  nome: string;
  data: string;
  aplicados: number;
  pendentes: ListaRecortada<AnimalPendente>;
}

export interface CoberturaLote {
  lote: {
    id: string;
    identificacao: string;
    especie: string;
    quantidadeDeclarada: number;
    dataAquisicao: string;
  };
  rebanho: {
    declarado: number;
    cadastrados: number;
    ativos: number;
    /** Declarado − ativos. Positivo = cabeças sem cadastro individual. */
    divergencia: number;
    baixas: {
      total: number;
      porStatus: { status: StatusAnimal; quantidade: number }[];
      ultimas: {
        id: string;
        identificador: string;
        status: StatusAnimal;
        dataSaida: string;
        motivoSaida?: string | null;
      }[];
    };
  };
  /** Nulo quando quem pediu não tem o módulo Pesagens. */
  pesagem: {
    referencia: string;
    origemReferencia: 'pesagem-do-lote' | 'aquisicao';
    pesoMedioNaReferencia: number | null;
    pesados: number;
    pendentes: ListaRecortada<AnimalPendente>;
  } | null;
  /** Nulo quando quem pediu não tem o módulo Sanidade. */
  sanidade: {
    manejos: ManejoSanitarioDoLote[];
    semRegistro: ListaRecortada<AnimalPendente>;
    reaplicacoesVencidas: ListaRecortada<{
      animalId: string;
      identificador: string;
      nome: string;
      proximaAplicacao: string;
    }>;
    custoInsumosAplicados: number;
  } | null;
}

export function obterCoberturaLote(id: string) {
  return api<CoberturaLote>(`/lotes/${id}/cobertura`);
}

// ----- Custo individual dos animais do lote -----

export interface CustoAnimalDoLote {
  animalId: string;
  identificador: string;
  compra: number | null;
  rateio: number;
  direto: number;
  total: number;
  lancamentosSemValor: number;
}

export interface CustosDoLote {
  lote: { id: string; identificacao: string };
  /** Parcelas iguais pra todo o lote — a tela mostra uma vez. */
  comum: {
    compraPorCabeca: number | null;
    rateioPorCabeca: number | null;
    totalRateavel: number | null;
    comprasDeInsumo: number | null;
    cabecas: number | null;
  };
  ressalvas: string[];
  totalDiretoDoLote: number;
  animais: CustoAnimalDoLote[];
}

export function obterCustosDoLote(id: string) {
  return api<CustosDoLote>(`/lotes/${id}/custos`);
}
