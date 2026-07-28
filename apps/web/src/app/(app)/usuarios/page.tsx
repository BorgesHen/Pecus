'use client';

import { Fragment, useEffect, useState } from 'react';
import {
  ModuloSistema,
  NivelAcesso,
  PapelUsuario,
  LABEL_MODULO_SISTEMA,
  type PermissoesGranulares,
} from '@pecus/shared';
import {
  listarUsuarios,
  criarUsuario,
  atualizarInfoUsuario,
  atualizarPermissoes,
  removerUsuario,
  type VinculoUsuario,
} from '@/lib/usuarios';
import { ApiError } from '@/lib/api';
import { PopupErro } from '@/components/PopupErro';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';

const MODULOS_PERMISSAO: ModuloSistema[] = [
  ModuloSistema.LOTES,
  ModuloSistema.ANIMAIS,
  ModuloSistema.SANIDADE,
  ModuloSistema.REPRODUCAO,
  ModuloSistema.ESTOQUE,
  ModuloSistema.PESAGENS,
  ModuloSistema.GASTOS,
  ModuloSistema.RELATORIOS,
];
const MODULOS_EDITAVEIS: { modulo: ModuloSistema; label: string }[] = MODULOS_PERMISSAO.map(
  (modulo) => ({ modulo, label: LABEL_MODULO_SISTEMA[modulo] }),
);

const PERMISSOES_VAZIAS: Record<ModuloSistema, NivelAcesso> = {
  [ModuloSistema.LOTES]: NivelAcesso.NENHUM,
  [ModuloSistema.PESAGENS]: NivelAcesso.NENHUM,
  [ModuloSistema.GASTOS]: NivelAcesso.NENHUM,
  [ModuloSistema.RELATORIOS]: NivelAcesso.NENHUM,
  [ModuloSistema.USUARIOS]: NivelAcesso.NENHUM,
  [ModuloSistema.ANIMAIS]: NivelAcesso.NENHUM,
  [ModuloSistema.SANIDADE]: NivelAcesso.NENHUM,
  [ModuloSistema.REPRODUCAO]: NivelAcesso.NENHUM,
  [ModuloSistema.ESTOQUE]: NivelAcesso.NENHUM,
  [ModuloSistema.METODOS_MANEJO]: NivelAcesso.NENHUM,
};

interface FormUsuario {
  nome: string;
  usuario: string;
  email: string;
  senha: string;
  permissoes: Record<ModuloSistema, NivelAcesso>;
}

const FORM_VAZIO: FormUsuario = {
  nome: '',
  usuario: '',
  email: '',
  senha: '',
  permissoes: { ...PERMISSOES_VAZIAS },
};

function rotuloNivel(nivel: NivelAcesso) {
  if (nivel === NivelAcesso.EDITAR) return 'editar';
  if (nivel === NivelAcesso.VER) return 'ver';
  return 'nenhum';
}

function resumoPermissoes(vinculo: VinculoUsuario) {
  if (vinculo.papel !== PapelUsuario.USUARIO) return 'Acesso total (dono da fazenda)';
  const permissoes = (vinculo.permissoes ?? {}) as PermissoesGranulares;
  const partes = MODULOS_EDITAVEIS.filter((m) => (permissoes[m.modulo] ?? NivelAcesso.NENHUM) !== NivelAcesso.NENHUM).map(
    (m) => `${m.label}: ${rotuloNivel(permissoes[m.modulo] ?? NivelAcesso.NENHUM)}`,
  );
  return partes.length > 0 ? partes.join(' · ') : 'Sem acesso a módulos ainda';
}

export default function UsuariosPage() {
  const [vinculos, setVinculos] = useState<VinculoUsuario[] | null>(null);
  const [erro, setErro] = useState('');
  const [erroDuplicidade, setErroDuplicidade] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<VinculoUsuario | null>(null);
  const [form, setForm] = useState<FormUsuario>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<VinculoUsuario | null>(null);

  function carregar() {
    listarUsuarios()
      .then(setVinculos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar usuários'));
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(vinculo: VinculoUsuario) {
    const permissoes = { ...PERMISSOES_VAZIAS, ...(vinculo.permissoes ?? {}) };
    setEditando(vinculo);
    setForm({
      nome: vinculo.usuario.nome,
      usuario: vinculo.usuario.usuario,
      email: vinculo.usuario.email,
      senha: '',
      permissoes,
    });
    setModalAberto(true);
  }

  function mudarPermissao(modulo: ModuloSistema, nivel: NivelAcesso) {
    setForm((f) => ({ ...f, permissoes: { ...f.permissoes, [modulo]: nivel } }));
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      if (editando) {
        await atualizarInfoUsuario(editando.usuarioId, {
          nome: form.nome,
          usuario: form.usuario,
          email: form.email,
        });
        if (editando.papel === PapelUsuario.USUARIO) {
          await atualizarPermissoes(editando.usuarioId, form.permissoes);
        }
      } else {
        await criarUsuario({
          nome: form.nome,
          usuario: form.usuario,
          email: form.email,
          senha: form.senha,
          permissoes: form.permissoes,
        });
      }
      setModalAberto(false);
      carregar();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErroDuplicidade(e.message);
      } else {
        setErro(e instanceof Error ? e.message : 'Erro ao salvar usuário');
      }
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    try {
      await removerUsuario(paraExcluir.usuarioId);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover usuário');
    } finally {
      setParaExcluir(null);
    }
  }

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Usuários</h2>
        <button className="btn" onClick={abrirNovo}>
          + Novo usuário
        </button>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {!vinculos && !erro && <p>Carregando...</p>}

      {vinculos && vinculos.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum usuário vinculado ainda.</p>
        </div>
      )}

      {vinculos && vinculos.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Permissões</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vinculos.map((v) => (
                <tr key={v.id}>
                  <td data-label="Nome">{v.usuario.nome}</td>
                  <td data-label="Usuário">{v.usuario.usuario}</td>
                  <td data-label="E-mail">{v.usuario.email}</td>
                  <td data-label="Papel">{v.papel}</td>
                  <td data-label="Permissões">{resumoPermissoes(v)}</td>
                  <td data-label="">
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn-secundario" onClick={() => abrirEdicao(v)}>
                        Editar
                      </button>
                      <button className="btn-perigo" onClick={() => setParaExcluir(v)}>
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editando ? 'Editar usuário' : 'Novo usuário'}</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Nome</label>
                <input
                  className="input"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Usuário (para fazer login)</label>
                <input
                  className="input"
                  value={form.usuario}
                  onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                />
              </div>
            </div>
            <div className="linha-campos">
              <div className="campo">
                <label>E-mail</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              {!editando && (
                <div className="campo">
                  <label>Senha (mín. 6 caracteres)</label>
                  <input
                    className="input"
                    type="password"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  />
                </div>
              )}
            </div>

            {(!editando || editando.papel === PapelUsuario.USUARIO) && (
              <>
                <p style={{ fontSize: 13, color: 'var(--texto-suave)', marginBottom: 4 }}>
                  Permissões por módulo
                </p>
                <div className="permissoes-grade">
                  {MODULOS_EDITAVEIS.map(({ modulo, label }) => (
                    <Fragment key={modulo}>
                      <label>{label}</label>
                      <select
                        value={form.permissoes[modulo]}
                        onChange={(e) => mudarPermissao(modulo, e.target.value as NivelAcesso)}
                      >
                        <option value={NivelAcesso.NENHUM}>Nenhum</option>
                        <option value={NivelAcesso.VER}>Ver</option>
                        <option value={NivelAcesso.EDITAR}>Editar</option>
                      </select>
                    </Fragment>
                  ))}
                </div>
              </>
            )}

            {editando && editando.papel !== PapelUsuario.USUARIO && (
              <p style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
                Dono da fazenda: acesso total, sem permissões para configurar.
              </p>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={salvar}
                disabled={
                  salvando ||
                  !form.nome ||
                  !form.usuario ||
                  !form.email ||
                  (!editando && form.senha.length < 6)
                }
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {erroDuplicidade && (
        <PopupErro mensagem={erroDuplicidade} onFechar={() => setErroDuplicidade('')} />
      )}

      {paraExcluir && (
        <PopupConfirmacao
          titulo="Remover usuário?"
          mensagem={`O vínculo de "${paraExcluir.usuario.nome}" com a fazenda será removido. A conta dele não será apagada.`}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </div>
  );
}
