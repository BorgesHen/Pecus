import { NaturezaFinanceira } from '@prisma/client';

/**
 * Plano de contas padrão criado para toda fazenda nova (ver auth.service.ts#registrar
 * e prisma/seed.ts). Baseado nos grupos reais de uma planilha de controle
 * financeiro de pecuária — a fazenda pode editar/adicionar contas depois.
 */
export const PLANO_CONTAS_PADRAO: {
  natureza: NaturezaFinanceira;
  codigo: string;
  nome: string;
  ordem: number;
  contas: { codigo: string; nome: string }[];
}[] = [
  {
    natureza: NaturezaFinanceira.RECEITA,
    codigo: '1.1',
    nome: 'Receita com Vendas',
    ordem: 1,
    contas: [
      { codigo: '1.1.1', nome: 'Vacas' },
      { codigo: '1.1.2', nome: 'Novilhas' },
      { codigo: '1.1.3', nome: 'Bois' },
    ],
  },
  {
    natureza: NaturezaFinanceira.RECEITA,
    codigo: '1.6',
    nome: 'Receitas Financeiras',
    ordem: 2,
    contas: [
      { codigo: '1.6.1', nome: 'Receitas Financeiras' },
      { codigo: '1.6.2', nome: 'Juros de Aplicações' },
    ],
  },
  {
    natureza: NaturezaFinanceira.DESPESA,
    codigo: '2.1',
    nome: 'Custos Variáveis',
    ordem: 3,
    contas: [
      { codigo: '2.1.1', nome: 'Ração' },
      { codigo: '2.1.2', nome: 'Sal' },
      { codigo: '2.1.3', nome: 'Brincos' },
      { codigo: '2.1.4', nome: 'Medicamento Gado' },
      { codigo: '2.1.5', nome: 'Comissões de Compra' },
      { codigo: '2.1.6', nome: 'Feno' },
    ],
  },
  {
    natureza: NaturezaFinanceira.DESPESA,
    codigo: '2.3',
    nome: 'Despesas com Ocupação',
    ordem: 4,
    contas: [
      { codigo: '2.3.1', nome: 'Arrendamento' },
      { codigo: '2.3.2', nome: 'Energia Elétrica' },
      { codigo: '2.3.3', nome: 'Adubo' },
      { codigo: '2.3.4', nome: 'Implantação de Pastagem' },
    ],
  },
  {
    natureza: NaturezaFinanceira.DESPESA,
    codigo: '2.4',
    nome: 'Despesas com Serviços',
    ordem: 5,
    contas: [
      { codigo: '2.4.1', nome: 'Contabilidade' },
      { codigo: '2.4.2', nome: 'Frete' },
    ],
  },
  {
    natureza: NaturezaFinanceira.DESPESA,
    codigo: '2.5',
    nome: 'Despesas com Pessoal',
    ordem: 6,
    contas: [
      { codigo: '2.5.1', nome: 'Pró-Labore' },
      { codigo: '2.5.2', nome: 'Folha de Pagamento' },
      { codigo: '2.5.3', nome: 'Combustível' },
    ],
  },
  {
    natureza: NaturezaFinanceira.DESPESA,
    codigo: '2.7',
    nome: 'Impostos Diretos',
    ordem: 7,
    contas: [
      { codigo: '2.7.1', nome: 'IRPJ' },
      { codigo: '2.7.2', nome: 'CSLL' },
    ],
  },
  {
    natureza: NaturezaFinanceira.DESPESA,
    codigo: '2.8',
    nome: 'Outras Despesas',
    ordem: 8,
    contas: [
      { codigo: '2.8.1', nome: 'Manutenção' },
      { codigo: '2.8.2', nome: 'Diesel Trator' },
      { codigo: '2.8.3', nome: 'Diversos' },
    ],
  },
  {
    natureza: NaturezaFinanceira.DESPESA,
    codigo: '2.11',
    nome: 'Despesas Financeiras',
    ordem: 9,
    contas: [
      { codigo: '2.11.1', nome: 'Taxas Bancárias' },
      { codigo: '2.11.2', nome: 'Juros de Empréstimo' },
    ],
  },
  {
    natureza: NaturezaFinanceira.DESPESA,
    codigo: '2.12',
    nome: 'Investimentos',
    ordem: 10,
    contas: [
      { codigo: '2.12.1', nome: 'Máquinas' },
      { codigo: '2.12.2', nome: 'Veículos' },
    ],
  },
];
