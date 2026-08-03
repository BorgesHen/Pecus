'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ModuloSistema, NaturezaFinanceira, LABEL_NATUREZA_FINANCEIRA } from '@pecus/shared';
import {
  listarPlanoContas,
  criarGrupoFinanceiro,
  removerGrupoFinanceiro,
  criarContaFinanceira,
  atualizarContaFinanceira,
  removerContaFinanceira,
  type GrupoComContas,
} from '@/lib/financeiro';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';

export default function PlanoContasPage() {
  const toast = useToast();
  const { podeEditar } = usePermissoes();
  const podeEditarFinanceiro = podeEditar(ModuloSistema.FINANCEIRO);

  const [grupos, setGrupos] = useState<GrupoComContas[] | null>(null);
  const [erro, setErro] = useState('');

  const [modalGrupoAberto, setModalGrupoAberto] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ natureza: NaturezaFinanceira.DESPESA, codigo: '', nome: '' });

  const [grupoParaConta, setGrupoParaConta] = useState<GrupoComContas | null>(null);
  const [novaConta, setNovaConta] = useState({ codigo: '', nome: '' });

  const [paraExcluirGrupo, setParaExcluirGrupo] = useState<GrupoComContas | null>(null);
  const [paraExcluirConta, setParaExcluirConta] = useState<{ id: string; nome: string } | null>(null);

  function carregar() {
    listarPlanoContas()
      .then(setGrupos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar plano de contas'));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarGrupo() {
    try {
      await criarGrupoFinanceiro(novoGrupo);
      setModalGrupoAberto(false);
      toast.sucesso(`Grupo "${novoGrupo.nome}" criado.`);
      setNovoGrupo({ natureza: NaturezaFinanceira.DESPESA, codigo: '', nome: '' });
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao criar grupo');
    }
  }

  async function salvarConta() {
    if (!grupoParaConta) return;
    try {
      await criarContaFinanceira({ grupoId: grupoParaConta.id, ...novaConta });
      setGrupoParaConta(null);
      toast.sucesso(`Conta "${novaConta.nome}" criada.`);
      setNovaConta({ codigo: '', nome: '' });
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao criar conta');
    }
  }

  async function alternarAtivo(contaId: string, ativo: boolean) {
    try {
      await atualizarContaFinanceira(contaId, { ativo: !ativo });
      toast.sucesso(ativo ? 'Conta desativada.' : 'Conta reativada.');
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao atualizar conta');
    }
  }

  async function confirmarExclusaoGrupo() {
    if (!paraExcluirGrupo) return;
    const nome = paraExcluirGrupo.nome;
    try {
      await removerGrupoFinanceiro(paraExcluirGrupo.id);
      toast.sucesso(`Grupo "${nome}" excluído.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao excluir grupo');
    } finally {
      setParaExcluirGrupo(null);
    }
  }

  async function confirmarExclusaoConta() {
    if (!paraExcluirConta) return;
    const nome = paraExcluirConta.nome;
    try {
      await removerContaFinanceira(paraExcluirConta.id);
      toast.sucesso(`Conta "${nome}" excluída.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao excluir conta');
    } finally {
      setParaExcluirConta(null);
    }
  }

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Plano de contas</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/financeiro" className="btn-secundario">
            ← Lançamentos
          </Link>
          <button className="btn" onClick={() => setModalGrupoAberto(true)} disabled={!podeEditarFinanceiro}>
            + Novo grupo
          </button>
        </div>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {!grupos && !erro && <p>Carregando...</p>}

      {grupos &&
        grupos.map((grupo) => (
          <div key={grupo.id} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>
                  {grupo.codigo} — {grupo.nome}
                </strong>
                <span style={{ marginLeft: 8, color: 'var(--texto-suave)', fontSize: 13 }}>
                  {LABEL_NATUREZA_FINANCEIRA[grupo.natureza]}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-secundario"
                  onClick={() => setGrupoParaConta(grupo)}
                  disabled={!podeEditarFinanceiro}
                >
                  + Conta
                </button>
                <button
                  className="btn-perigo"
                  onClick={() => setParaExcluirGrupo(grupo)}
                  disabled={!podeEditarFinanceiro}
                >
                  Excluir grupo
                </button>
              </div>
            </div>

            {grupo.contas.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grupo.contas.map((conta) => (
                  <div
                    key={conta.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 0',
                      borderTop: '1px solid var(--borda)',
                    }}
                  >
                    <span style={{ opacity: conta.ativo ? 1 : 0.5 }}>
                      {conta.codigo} — {conta.nome}
                      {!conta.ativo && ' (inativa)'}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={conta.ativo}
                          onChange={() => alternarAtivo(conta.id, conta.ativo)}
                          disabled={!podeEditarFinanceiro}
                        />
                        Ativa
                      </label>
                      <button
                        className="btn-perigo"
                        onClick={() => setParaExcluirConta({ id: conta.id, nome: conta.nome })}
                        disabled={!podeEditarFinanceiro}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

      {modalGrupoAberto && (
        <div className="modal-overlay" onClick={() => setModalGrupoAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo grupo</h3>
            <div className="campo">
              <label>Natureza</label>
              <select
                className="input"
                value={novoGrupo.natureza}
                onChange={(e) =>
                  setNovoGrupo({ ...novoGrupo, natureza: e.target.value as NaturezaFinanceira })
                }
              >
                <option value={NaturezaFinanceira.DESPESA}>Despesa</option>
                <option value={NaturezaFinanceira.RECEITA}>Receita</option>
              </select>
            </div>
            <div className="linha-campos">
              <div className="campo">
                <label>Código</label>
                <input
                  className="input"
                  placeholder="ex: 2.9"
                  value={novoGrupo.codigo}
                  onChange={(e) => setNovoGrupo({ ...novoGrupo, codigo: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Nome</label>
                <input
                  className="input"
                  value={novoGrupo.nome}
                  onChange={(e) => setNovoGrupo({ ...novoGrupo, nome: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalGrupoAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarGrupo} disabled={!novoGrupo.codigo || !novoGrupo.nome}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {grupoParaConta && (
        <div className="modal-overlay" onClick={() => setGrupoParaConta(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nova conta em &quot;{grupoParaConta.nome}&quot;</h3>
            <div className="linha-campos">
              <div className="campo">
                <label>Código</label>
                <input
                  className="input"
                  placeholder={`ex: ${grupoParaConta.codigo}.1`}
                  value={novaConta.codigo}
                  onChange={(e) => setNovaConta({ ...novaConta, codigo: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Nome</label>
                <input
                  className="input"
                  value={novaConta.nome}
                  onChange={(e) => setNovaConta({ ...novaConta, nome: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setGrupoParaConta(null)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarConta} disabled={!novaConta.codigo || !novaConta.nome}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {paraExcluirGrupo && (
        <PopupConfirmacao
          titulo="Excluir grupo?"
          mensagem={`O grupo "${paraExcluirGrupo.nome}" será removido. Só é possível excluir grupos sem contas.`}
          onConfirmar={confirmarExclusaoGrupo}
          onCancelar={() => setParaExcluirGrupo(null)}
        />
      )}

      {paraExcluirConta && (
        <PopupConfirmacao
          titulo="Excluir conta?"
          mensagem={`A conta "${paraExcluirConta.nome}" será removida. Só é possível excluir contas sem lançamentos.`}
          onConfirmar={confirmarExclusaoConta}
          onCancelar={() => setParaExcluirConta(null)}
        />
      )}
    </div>
  );
}
