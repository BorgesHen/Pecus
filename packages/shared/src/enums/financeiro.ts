export enum NaturezaFinanceira {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

export const LABEL_NATUREZA_FINANCEIRA: Record<NaturezaFinanceira, string> = {
  [NaturezaFinanceira.RECEITA]: 'Receita',
  [NaturezaFinanceira.DESPESA]: 'Despesa',
};

export enum FormaPagamento {
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  FATURA = 'FATURA',
  DEBITO_AUTOMATICO = 'DEBITO_AUTOMATICO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  DINHEIRO = 'DINHEIRO',
  OUTRO = 'OUTRO',
}

export const LABEL_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  [FormaPagamento.PIX]: 'PIX',
  [FormaPagamento.BOLETO]: 'Boleto',
  [FormaPagamento.FATURA]: 'Fatura',
  [FormaPagamento.DEBITO_AUTOMATICO]: 'Débito automático',
  [FormaPagamento.TRANSFERENCIA]: 'Transferência',
  [FormaPagamento.DINHEIRO]: 'Dinheiro',
  [FormaPagamento.OUTRO]: 'Outro',
};

export enum TipoContato {
  CLIENTE = 'CLIENTE',
  FORNECEDOR = 'FORNECEDOR',
  AMBOS = 'AMBOS',
}

export const LABEL_TIPO_CONTATO: Record<TipoContato, string> = {
  [TipoContato.CLIENTE]: 'Cliente',
  [TipoContato.FORNECEDOR]: 'Fornecedor',
  [TipoContato.AMBOS]: 'Cliente e fornecedor',
};

/** Status calculado na leitura a partir de dataVencimento/dataLiquidacao — não é persistido. */
export enum StatusLancamento {
  EM_ABERTO = 'EM_ABERTO',
  ATRASADO = 'ATRASADO',
  LIQUIDADO = 'LIQUIDADO',
}

export const LABEL_STATUS_LANCAMENTO: Record<StatusLancamento, string> = {
  [StatusLancamento.EM_ABERTO]: 'Em aberto',
  [StatusLancamento.ATRASADO]: 'Atrasado',
  [StatusLancamento.LIQUIDADO]: 'Liquidado',
};
