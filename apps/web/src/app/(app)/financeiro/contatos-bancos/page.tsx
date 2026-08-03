'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ModuloSistema, TipoContato, LABEL_TIPO_CONTATO } from '@pecus/shared';
import {
  listarBancos,
  criarBanco,
  atualizarBanco,
  removerBanco,
  listarContatos,
  criarContato,
  removerContato,
  type NovaContaBancaria,
  type NovoContato,
} from '@/lib/financeiro';
import type { ContaBancaria, Contato } from '@pecus/shared';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';

const BANCO_VAZIO: NovaContaBancaria = { nome: '', saldoInicial: 0 };
const CONTATO_VAZIO: NovoContato = { tipo: TipoContato.FORNECEDOR, nome: '' };

export default function ContatosBancosPage() {
  const toast = useToast();
  const { podeEditar } = usePermissoes();
  const podeEditarFinanceiro = podeEditar(ModuloSistema.FINANCEIRO);

  const [bancos, setBancos] = useState<ContaBancaria[] | null>(null);
  const [contatos, setContatos] = useState<Contato[] | null>(null);
  const [erro, setErro] = useState('');

  const [modalBancoAberto, setModalBancoAberto] = useState(false);
  const [novoBanco, setNovoBanco] = useState<NovaContaBancaria>(BANCO_VAZIO);

  const [modalContatoAberto, setModalContatoAberto] = useState(false);
  const [novoContato, setNovoContato] = useState<NovoContato>(CONTATO_VAZIO);

  const [paraExcluirBanco, setParaExcluirBanco] = useState<ContaBancaria | null>(null);
  const [paraExcluirContato, setParaExcluirContato] = useState<Contato | null>(null);

  function carregar() {
    listarBancos().then(setBancos).catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar bancos'));
    listarContatos()
      .then(setContatos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar contatos'));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarBanco() {
    try {
      await criarBanco(novoBanco);
      setModalBancoAberto(false);
      toast.sucesso(`Banco "${novoBanco.nome}" cadastrado.`);
      setNovoBanco(BANCO_VAZIO);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao criar banco');
    }
  }

  async function alternarAtivoBanco(banco: ContaBancaria) {
    try {
      await atualizarBanco(banco.id, { ativo: !banco.ativo });
      toast.sucesso(banco.ativo ? `Banco "${banco.nome}" desativado.` : `Banco "${banco.nome}" reativado.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao atualizar banco');
    }
  }

  async function confirmarExclusaoBanco() {
    if (!paraExcluirBanco) return;
    const nome = paraExcluirBanco.nome;
    try {
      await removerBanco(paraExcluirBanco.id);
      toast.sucesso(`Banco "${nome}" excluído.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao excluir banco');
    } finally {
      setParaExcluirBanco(null);
    }
  }

  async function salvarContato() {
    try {
      await criarContato(novoContato);
      setModalContatoAberto(false);
      toast.sucesso(`Contato "${novoContato.nome}" cadastrado.`);
      setNovoContato(CONTATO_VAZIO);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao criar contato');
    }
  }

  async function confirmarExclusaoContato() {
    if (!paraExcluirContato) return;
    const nome = paraExcluirContato.nome;
    try {
      await removerContato(paraExcluirContato.id);
      toast.sucesso(`Contato "${nome}" excluído.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao excluir contato');
    } finally {
      setParaExcluirContato(null);
    }
  }

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Bancos &amp; contatos</h2>
        <Link href="/financeiro" className="btn-secundario">
          ← Lançamentos
        </Link>
      </div>

      {erro && <div className="erro">{erro}</div>}

      <div className="topo-tela" style={{ marginTop: 8 }}>
        <h3>Bancos</h3>
        <button className="btn" onClick={() => setModalBancoAberto(true)} disabled={!podeEditarFinanceiro}>
          + Novo banco
        </button>
      </div>

      {!bancos && !erro && <p>Carregando...</p>}
      {bancos && bancos.length === 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum banco cadastrado ainda.</p>
        </div>
      )}
      {bancos && bancos.length > 0 && (
        <div className="tabela-wrap" style={{ marginBottom: 24 }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Saldo inicial</th>
                <th>Ativo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bancos.map((b) => (
                <tr key={b.id}>
                  <td data-label="Nome">{b.nome}</td>
                  <td data-label="Saldo inicial">{brl(Number(b.saldoInicial))}</td>
                  <td data-label="Ativo">
                    <input
                      type="checkbox"
                      checked={b.ativo}
                      onChange={() => alternarAtivoBanco(b)}
                      disabled={!podeEditarFinanceiro}
                    />
                  </td>
                  <td data-label="">
                    <button
                      className="btn-perigo"
                      onClick={() => setParaExcluirBanco(b)}
                      disabled={!podeEditarFinanceiro}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="topo-tela">
        <h3>Contatos</h3>
        <button className="btn" onClick={() => setModalContatoAberto(true)} disabled={!podeEditarFinanceiro}>
          + Novo contato
        </button>
      </div>

      {!contatos && !erro && <p>Carregando...</p>}
      {contatos && contatos.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum contato cadastrado ainda.</p>
        </div>
      )}
      {contatos && contatos.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Telefone</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contatos.map((c) => (
                <tr key={c.id}>
                  <td data-label="Nome">{c.nome}</td>
                  <td data-label="Tipo">{LABEL_TIPO_CONTATO[c.tipo]}</td>
                  <td data-label="Documento">{c.documento ?? '—'}</td>
                  <td data-label="Telefone">{c.telefone ?? '—'}</td>
                  <td data-label="">
                    <button
                      className="btn-perigo"
                      onClick={() => setParaExcluirContato(c)}
                      disabled={!podeEditarFinanceiro}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalBancoAberto && (
        <div className="modal-overlay" onClick={() => setModalBancoAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo banco</h3>
            <div className="campo">
              <label>Nome</label>
              <input
                className="input"
                value={novoBanco.nome}
                onChange={(e) => setNovoBanco({ ...novoBanco, nome: e.target.value })}
              />
            </div>
            <div className="campo">
              <label>Saldo inicial (R$)</label>
              <input
                className="input"
                type="number"
                value={novoBanco.saldoInicial ?? 0}
                onChange={(e) => setNovoBanco({ ...novoBanco, saldoInicial: Number(e.target.value) })}
              />
            </div>
            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalBancoAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarBanco} disabled={!novoBanco.nome}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalContatoAberto && (
        <div className="modal-overlay" onClick={() => setModalContatoAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo contato</h3>
            <div className="linha-campos">
              <div className="campo">
                <label>Tipo</label>
                <select
                  className="input"
                  value={novoContato.tipo}
                  onChange={(e) => setNovoContato({ ...novoContato, tipo: e.target.value as TipoContato })}
                >
                  {Object.values(TipoContato).map((t) => (
                    <option key={t} value={t}>
                      {LABEL_TIPO_CONTATO[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Nome</label>
                <input
                  className="input"
                  value={novoContato.nome}
                  onChange={(e) => setNovoContato({ ...novoContato, nome: e.target.value })}
                />
              </div>
            </div>
            <div className="linha-campos">
              <div className="campo">
                <label>Documento (opcional)</label>
                <input
                  className="input"
                  value={novoContato.documento ?? ''}
                  onChange={(e) => setNovoContato({ ...novoContato, documento: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Telefone (opcional)</label>
                <input
                  className="input"
                  value={novoContato.telefone ?? ''}
                  onChange={(e) => setNovoContato({ ...novoContato, telefone: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalContatoAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarContato} disabled={!novoContato.nome}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {paraExcluirBanco && (
        <PopupConfirmacao
          titulo="Excluir banco?"
          mensagem={`O banco "${paraExcluirBanco.nome}" será removido.`}
          onConfirmar={confirmarExclusaoBanco}
          onCancelar={() => setParaExcluirBanco(null)}
        />
      )}

      {paraExcluirContato && (
        <PopupConfirmacao
          titulo="Excluir contato?"
          mensagem={`O contato "${paraExcluirContato.nome}" será removido.`}
          onConfirmar={confirmarExclusaoContato}
          onCancelar={() => setParaExcluirContato(null)}
        />
      )}
    </div>
  );
}
