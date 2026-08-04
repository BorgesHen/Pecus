'use client';

import { Fragment, useEffect, useState } from 'react';
import {
  EntidadeAtividade,
  ModuloSistema,
  NivelAcesso,
  PapelUsuario,
  LABEL_MODULO_SISTEMA,
  DIAS_VALIDADE_PROVISORIA,
  type PermissoesGranulares,
} from '@pecus/shared';
import {
  listarUsuarios,
  criarUsuario,
  resetarSenhaUsuario,
  type CredenciaisProvisorias,
  atualizarInfoUsuario,
  atualizarPermissoes,
  removerUsuario,
  type VinculoUsuario,
} from '@/lib/usuarios';
import { ApiError } from '@/lib/api';
import { KeyRound, Mail, MailCheck } from 'lucide-react';
import { PopupErro } from '@/components/PopupErro';
import { PopupCredenciais } from '@/components/PopupCredenciais';
import { BotaoHistorico } from '@/components/BotaoHistorico';
import { useToast } from '@/contexts/ToastContext';
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
  ModuloSistema.PIQUETES,
  ModuloSistema.AREAS,
  ModuloSistema.FINANCEIRO,
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
  [ModuloSistema.PIQUETES]: NivelAcesso.NENHUM,
  [ModuloSistema.AREAS]: NivelAcesso.NENHUM,
  [ModuloSistema.FINANCEIRO]: NivelAcesso.NENHUM,
};

interface FormUsuario {
  nome: string;
  usuario: string;
  email: string;
  permissoes: Record<ModuloSistema, NivelAcesso>;
}

const FORM_VAZIO: FormUsuario = {
  nome: '',
  usuario: '',
  email: '',
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

/** Estado do acesso: quem ainda não criou senha e quem já confirmou o e-mail. */
function seloAcesso(vinculo: VinculoUsuario) {
  const u = vinculo.usuario;
  if (u.senhaProvisoria) {
    const vencida = !!u.senhaProvisoriaExpiraEm && new Date(u.senhaProvisoriaExpiraEm) < new Date();
    return (
      <span className="selo selo--pendente">
        <KeyRound size={12} aria-hidden /> {vencida ? 'Provisória vencida' : 'Senha provisória'}
      </span>
    );
  }
  if (u.emailVerificadoEm) {
    return (
      <span className="selo selo--verificado">
        <MailCheck size={12} aria-hidden /> E-mail confirmado
      </span>
    );
  }
  return <span style={{ color: 'var(--texto-suave)', fontSize: 13 }}>Senha própria</span>;
}

export default function UsuariosPage() {
  const toast = useToast();
  const [vinculos, setVinculos] = useState<VinculoUsuario[] | null>(null);
  const [erro, setErro] = useState('');
  const [erroDuplicidade, setErroDuplicidade] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<VinculoUsuario | null>(null);
  const [form, setForm] = useState<FormUsuario>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<VinculoUsuario | null>(null);
  const [credenciais, setCredenciais] = useState<CredenciaisProvisorias | null>(null);
  const [tituloCredenciais, setTituloCredenciais] = useState('');
  const [resetandoId, setResetandoId] = useState('');
  const [paraResetar, setParaResetar] = useState<VinculoUsuario | null>(null);

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
      permissoes,
    });
    setModalAberto(true);
  }

  function mudarPermissao(modulo: ModuloSistema, nivel: NivelAcesso) {
    setForm((f) => ({ ...f, permissoes: { ...f.permissoes, [modulo]: nivel } }));
  }

  async function salvar() {
    setSalvando(true);
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
        const r = await criarUsuario({
          nome: form.nome,
          usuario: form.usuario,
          email: form.email,
          permissoes: form.permissoes,
        });
        setModalAberto(false);
        if (r.contaNova && r.senhaProvisoria) {
          setTituloCredenciais(`Acesso criado para ${form.nome}`);
          setCredenciais({
            usuario: form.usuario,
            nome: form.nome,
            email: form.email,
            senhaProvisoria: r.senhaProvisoria,
            emailEnviado: r.emailEnviado,
            diasValidade: DIAS_VALIDADE_PROVISORIA,
          });
        } else {
          // E-mail já tinha conta no sistema: só ganhou acesso a esta fazenda,
          // e continua entrando com a senha que já usava.
          toast.sucesso(`${form.nome} já tinha conta e agora tem acesso a esta fazenda.`);
        }
        carregar();
        return;
      }
      setModalAberto(false);
      toast.sucesso(`Dados de ${form.nome} atualizados.`);
      carregar();
    } catch (e) {
      // Duplicidade continua no popup: é um caso que o usuário precisa reconhecer
      // e corrigir antes de tentar de novo, não só ser avisado de passagem.
      if (e instanceof ApiError && e.status === 409) {
        setErroDuplicidade(e.message);
      } else {
        toast.erroDe(e, 'Erro ao salvar usuário');
      }
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarReset() {
    if (!paraResetar) return;
    const alvo = paraResetar;
    setParaResetar(null);
    setResetandoId(alvo.usuarioId);
    try {
      const dados = await resetarSenhaUsuario(alvo.usuarioId);
      setTituloCredenciais(`Nova senha provisória de ${dados.nome}`);
      setCredenciais(dados);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao resetar a senha');
    } finally {
      setResetandoId('');
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const nome = paraExcluir.usuario.nome;
    try {
      await removerUsuario(paraExcluir.usuarioId);
      toast.sucesso(`${nome} removido desta fazenda.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao remover usuário');
    } finally {
      setParaExcluir(null);
    }
  }

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Usuários</h2>
        <div className="acoes-celula">
          <BotaoHistorico entidade={EntidadeAtividade.USUARIO} />
          <button className="btn" onClick={abrirNovo}>
            + Novo usuário
          </button>
        </div>
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
                <th>Acesso</th>
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
                  <td data-label="Acesso">{seloAcesso(v)}</td>
                  <td data-label="Papel">{v.papel}</td>
                  <td data-label="Permissões">{resumoPermissoes(v)}</td>
                  <td data-label="">
                    <div className="acoes-celula" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-secundario" onClick={() => abrirEdicao(v)}>
                        Editar
                      </button>
                      <button
                        className="btn-secundario"
                        onClick={() => setParaResetar(v)}
                        disabled={resetandoId === v.usuarioId}
                      >
                        <KeyRound size={14} aria-hidden />{' '}
                        {resetandoId === v.usuarioId ? 'Gerando...' : 'Resetar senha'}
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
            </div>

            {!editando && (
              <div className="credencial-aviso" style={{ marginTop: 4 }}>
                <Mail size={17} aria-hidden />
                <span>
                  Você não define a senha. O sistema gera uma provisória, envia pro e-mail acima e
                  mostra aqui pra você repassar se precisar. {form.nome ? form.nome.split(' ')[0] : 'A pessoa'} cria
                  a senha definitiva no primeiro acesso.
                </span>
              </div>
            )}

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
                  !form.email
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

      {credenciais && (
        <PopupCredenciais
          dados={credenciais}
          titulo={tituloCredenciais}
          onFechar={() => setCredenciais(null)}
        />
      )}

      {paraResetar && (
        <PopupConfirmacao
          titulo="Resetar a senha?"
          mensagem={`A senha atual de ${paraResetar.usuario.nome} deixa de funcionar na hora e uma provisória entra no lugar. Ela vai aparecer aqui pra você repassar, e também vai por e-mail se o envio estiver configurado.`}
          textoConfirmar="Resetar senha"
          onConfirmar={confirmarReset}
          onCancelar={() => setParaResetar(null)}
        />
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
