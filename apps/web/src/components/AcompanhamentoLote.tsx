'use client';

import Link from 'next/link';
import { LABEL_STATUS_ANIMAL, type StatusAnimal } from '@pecus/shared';
import { brData } from '@/lib/data';
import { brl } from '@/lib/formato';
import type { AnimalPendente, CoberturaLote, ListaRecortada } from '@/lib/lotes';

/**
 * Acompanhamento do lote: cruza o lote com os animais que estão dentro dele.
 *
 * Responde a pergunta do brete — "o lote tem 50 cabeças, quem ainda falta
 * passar?". Antes o lote só conhecia a média (uma pesagem de lote) e o animal só
 * conhecia a si mesmo; ninguém cruzava os dois.
 */

/** Lista de pendentes com link pra ficha de cada animal, recortada no servidor. */
function Pendentes({ lista, vazio }: { lista: ListaRecortada<AnimalPendente>; vazio: string }) {
  if (lista.total === 0) {
    return <p style={{ color: 'var(--texto-suave)', fontSize: 13, margin: 0 }}>{vazio}</p>;
  }
  const escondidos = lista.total - lista.itens.length;
  return (
    <p style={{ fontSize: 13, margin: 0, lineHeight: 1.9 }}>
      {lista.itens.map((animal) => (
        <Link key={animal.id} href={`/animais/${animal.id}`} className="selo" style={{ marginRight: 6 }}>
          {animal.identificador}
        </Link>
      ))}
      {/* O servidor recorta a lista; dizer quantos sobraram evita a leitura de
          que estes são todos. */}
      {escondidos > 0 && (
        <span style={{ color: 'var(--texto-suave)' }}>e mais {escondidos}…</span>
      )}
    </p>
  );
}

export function AcompanhamentoLote({ cobertura }: { cobertura: CoberturaLote }) {
  const { rebanho, pesagem, sanidade } = cobertura;

  return (
    <>
      <h3 style={{ marginBottom: 4 }}>Acompanhamento do lote</h3>
      <p style={{ color: 'var(--texto-suave)', marginBottom: 12, fontSize: 14 }}>
        Cruza as cabeças declaradas no lote com os animais cadastrados: quem já passou na balança,
        quem ficou de fora do último manejo e quem saiu do rebanho.
      </p>

      <div className="grid-cards" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="metrica">{rebanho.ativos}</div>
          <div className="metrica-label">
            <Link href={`/animais?loteId=${cobertura.lote.id}`}>Animais ativos</Link>
            {` de ${rebanho.declarado} declarados`}
          </div>
        </div>
        {pesagem && (
          <div className="card">
            <div className="metrica" style={pesagem.pendentes.total > 0 ? { color: 'var(--erro)' } : undefined}>
              {pesagem.pendentes.total}
            </div>
            <div className="metrica-label">Faltam pesar nesta rodada</div>
          </div>
        )}
        {sanidade && (
          <div className="card">
            <div className="metrica" style={sanidade.semRegistro.total > 0 ? { color: 'var(--erro)' } : undefined}>
              {sanidade.semRegistro.total}
            </div>
            <div className="metrica-label">Sem nenhum registro sanitário</div>
          </div>
        )}
        <div className="card">
          <div className="metrica">{rebanho.baixas.total}</div>
          <div className="metrica-label">Baixas (venda, morte, transferência)</div>
        </div>
      </div>

      {rebanho.divergencia !== 0 && (
        <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginBottom: 16 }}>
          {rebanho.divergencia > 0
            ? `O lote declara ${rebanho.declarado} cabeças e ${rebanho.ativos} estão cadastradas individualmente — ${rebanho.divergencia} sem cadastro. O rateio de custo usa as ${rebanho.declarado} declaradas.`
            : `Há ${-rebanho.divergencia} animal(is) ativos a mais do que o lote declara (${rebanho.declarado}). Vale conferir a quantidade do lote.`}
        </p>
      )}

      {pesagem && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginTop: 0, marginBottom: 4 }}>Pesagem — rodada atual</h4>
          <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginBottom: 8 }}>
            {/* A rodada é contada a partir da última pesagem do lote: lançar uma
                nova abre rodada nova e o contador reinicia. */}
            {pesagem.origemReferencia === 'pesagem-do-lote'
              ? `Desde a última pesagem do lote, em ${brData(pesagem.referencia)}`
              : `O lote ainda não tem pesagem de lote — contando desde a aquisição, em ${brData(pesagem.referencia)}`}
            {pesagem.pesoMedioNaReferencia != null && ` (média ${pesagem.pesoMedioNaReferencia} kg)`}
            {`. Pesados: ${pesagem.pesados}.`}
          </p>
          <Pendentes lista={pesagem.pendentes} vazio="Todos os animais ativos já foram pesados nesta rodada." />
        </div>
      )}

      {sanidade && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginTop: 0, marginBottom: 4 }}>Manejo sanitário</h4>

          {sanidade.manejos.length === 0 ? (
            <p style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
              Nenhum manejo sanitário registrado nos animais deste lote.
            </p>
          ) : (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Manejo</th>
                    <th>Data</th>
                    <th>Aplicados</th>
                    <th>Faltam</th>
                  </tr>
                </thead>
                <tbody>
                  {sanidade.manejos.map((manejo) => (
                    <tr key={`${manejo.nome}-${manejo.data}`}>
                      <td data-label="Manejo">
                        <strong>{manejo.nome}</strong>
                      </td>
                      <td data-label="Data">{brData(manejo.data)}</td>
                      <td data-label="Aplicados">{manejo.aplicados}</td>
                      <td data-label="Faltam">
                        {manejo.pendentes.total === 0 ? (
                          '—'
                        ) : (
                          <>
                            <strong style={{ color: 'var(--erro)' }}>{manejo.pendentes.total}</strong>
                            <br />
                            <Pendentes lista={manejo.pendentes} vazio="" />
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sanidade.semRegistro.total > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 13 }}>Sem nenhum registro sanitário:</strong>{' '}
              <Pendentes lista={sanidade.semRegistro} vazio="" />
            </div>
          )}

          {sanidade.reaplicacoesVencidas.total > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 13, color: 'var(--erro)' }}>
                Reaplicação vencida ({sanidade.reaplicacoesVencidas.total}):
              </strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: 13 }}>
                {sanidade.reaplicacoesVencidas.itens.map((vencida, indice) => (
                  <li key={`${vencida.animalId}-${vencida.nome}-${indice}`}>
                    <Link href={`/animais/${vencida.animalId}`}>{vencida.identificador}</Link> —{' '}
                    {vencida.nome}, vencida em {brData(vencida.proximaAplicacao)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sanidade.custoInsumosAplicados > 0 && (
            <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 12, marginBottom: 0 }}>
              Insumos aplicados nos animais ativos deste lote:{' '}
              <strong>{brl(sanidade.custoInsumosAplicados)}</strong>. Este valor já está no custo
              individual de cada animal.
            </p>
          )}
        </div>
      )}

      {rebanho.baixas.ultimas.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h4 style={{ marginTop: 0, marginBottom: 8 }}>Últimas baixas</h4>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {rebanho.baixas.ultimas.map((baixa) => (
                  <tr key={baixa.id}>
                    <td data-label="Animal">
                      <Link href={`/animais/${baixa.id}`}>{baixa.identificador}</Link>
                    </td>
                    <td data-label="Status">{LABEL_STATUS_ANIMAL[baixa.status as StatusAnimal]}</td>
                    <td data-label="Data">{brData(baixa.dataSaida)}</td>
                    <td data-label="Motivo">{baixa.motivoSaida || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
