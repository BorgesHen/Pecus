'use client';

import { useEffect, useState } from 'react';
import {
  ModuloSistema,
  MODULOS_CONFIGURAVEIS,
  CAMPO_MODULO_ATIVO,
  LABEL_MODULO_SISTEMA,
  TELAS_CAMPOS_CONFIGURAVEIS,
  type ConfiguracaoEmpresa,
} from '@pecus/shared';
import { obterConfiguracaoEmpresa, atualizarConfiguracaoEmpresa } from '@/lib/empresas';
import { usePermissoes } from '@/contexts/PermissoesContext';

const DESCRICAO_MODULO: Partial<Record<ModuloSistema, string>> = {
  [ModuloSistema.ANIMAIS]: 'Cadastro individual de animais dentro dos lotes.',
  [ModuloSistema.SANIDADE]: 'Vacinas, medicamentos e alertas de vencimento.',
  [ModuloSistema.REPRODUCAO]: 'Estação de monta, diagnóstico de gestação, partos.',
  [ModuloSistema.ESTOQUE]: 'Controle de saldo de insumos (ração, suplemento etc.).',
  [ModuloSistema.METODOS_MANEJO]: 'Tela de gestão de métodos de manejo customizados.',
  [ModuloSistema.AREAS]: 'Cadastro de áreas de pasto, com subdivisão em piquetes e controle de altura do capim.',
  [ModuloSistema.FINANCEIRO]: 'Plano de contas, contas a pagar/receber, bancos e contatos.',
};

export default function ConfiguracoesPage() {
  const { definirConfigEmpresa } = usePermissoes();
  const [config, setConfig] = useState<ConfiguracaoEmpresa | null>(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    obterConfiguracaoEmpresa()
      .then(setConfig)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar configurações'));
  }, []);

  function alternarModulo(modulo: ModuloSistema) {
    const campo = CAMPO_MODULO_ATIVO[modulo] as keyof ConfiguracaoEmpresa | undefined;
    if (!campo || !config) return;
    setConfig({ ...config, [campo]: !config[campo] });
  }

  function alternarCampo(chave: string) {
    if (!config) return;
    const desativado = config.camposDesativados.includes(chave);
    setConfig({
      ...config,
      camposDesativados: desativado
        ? config.camposDesativados.filter((c) => c !== chave)
        : [...config.camposDesativados, chave],
    });
  }

  async function salvar() {
    if (!config) return;
    setSalvando(true);
    setErro('');
    setSucesso(false);
    try {
      const atualizado = await atualizarConfiguracaoEmpresa(config);
      setConfig(atualizado);
      definirConfigEmpresa(atualizado);
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar configurações');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Configurações da fazenda</h2>
        <button className="btn" onClick={salvar} disabled={salvando || !config}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <p style={{ color: 'var(--texto-suave)', marginBottom: 20, fontSize: 14 }}>
        Ative só os módulos que sua fazenda usa — os desativados somem do menu e ficam
        indisponíveis pra todo mundo, mesmo quem tem permissão.
      </p>

      {erro && <div className="erro">{erro}</div>}
      {sucesso && (
        <p style={{ color: 'var(--verde)', marginBottom: 16, fontSize: 14 }}>
          Configurações salvas.
        </p>
      )}

      {!config && !erro && <p>Carregando...</p>}

      {config && (
        <>
          <h3 style={{ marginBottom: 12 }}>Módulos</h3>
          <div className="grid-cards" style={{ marginBottom: 28 }}>
            {MODULOS_CONFIGURAVEIS.map((modulo) => {
              const campo = CAMPO_MODULO_ATIVO[modulo] as keyof ConfiguracaoEmpresa;
              const ativo = Boolean(config[campo]);
              return (
                <div key={modulo} className="card">
                  <label
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <span>
                      <strong>{LABEL_MODULO_SISTEMA[modulo]}</strong>
                      <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 4 }}>
                        {DESCRICAO_MODULO[modulo]}
                      </p>
                    </span>
                    <input
                      type="checkbox"
                      checked={ativo}
                      onChange={() => alternarModulo(modulo)}
                      style={{ width: 20, height: 20, flexShrink: 0 }}
                    />
                  </label>
                </div>
              );
            })}
          </div>

          <h3 style={{ marginBottom: 4 }}>Campos por tela</h3>
          <p style={{ color: 'var(--texto-suave)', marginBottom: 12, fontSize: 14 }}>
            Desmarque um campo pra ele deixar de aparecer nos formulários de cadastro dessa tela.
            Dados já preenchidos antes de desativar não são apagados, só ficam ocultos.
          </p>
          <div style={{ marginBottom: 28 }}>
            {Object.entries(TELAS_CAMPOS_CONFIGURAVEIS).map(([telaId, tela]) => (
              <div key={telaId} className="card" style={{ marginBottom: 12 }}>
                <strong>{tela.label}</strong>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tela.campos.map((c) => (
                    <label
                      key={c.chave}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={!config.camposDesativados.includes(c.chave)}
                        onChange={() => alternarCampo(c.chave)}
                        style={{ width: 18, height: 18, flexShrink: 0 }}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: 12 }}>Configurações gerais</h3>
          <div className="linha-campos" style={{ maxWidth: 500 }}>
            <div className="campo">
              <label>Rendimento de carcaça padrão (%)</label>
              <input
                className="input"
                type="number"
                value={config.rendimentoCarcacaPadrao}
                onChange={(e) =>
                  setConfig({ ...config, rendimentoCarcacaPadrao: Number(e.target.value) })
                }
              />
              <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 6 }}>
                Usado no cálculo de arroba de lotes sem rendimento de carcaça próprio.
              </p>
            </div>
            <div className="campo">
              <label>Aviso de vencimento sanitário (dias)</label>
              <input
                className="input"
                type="number"
                value={config.sanidadeDiasAvisoVencimento}
                onChange={(e) =>
                  setConfig({ ...config, sanidadeDiasAvisoVencimento: Number(e.target.value) })
                }
              />
              <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 6 }}>
                Com quantos dias de antecedência a tela de Sanidade avisa de uma aplicação
                próxima do vencimento.
              </p>
            </div>
            <div className="campo">
              <label>Altura ideal do capim (cm)</label>
              <input
                className="input"
                type="number"
                value={config.alturaIdealPastoPadrao}
                onChange={(e) =>
                  setConfig({ ...config, alturaIdealPastoPadrao: Number(e.target.value) })
                }
              />
              <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 6 }}>
                Altura em que um piquete fica pronto pra receber o gado, se ele não tiver uma
                altura ideal própria definida.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
