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
import { useToast } from '@/contexts/ToastContext';

const DESCRICAO_MODULO: Partial<Record<ModuloSistema, string>> = {
  [ModuloSistema.LOTES]: 'Cadastro de lotes de gado, ganho de peso e método de manejo.',
  [ModuloSistema.GASTOS]: 'Lançamento de gastos por categoria e por lote.',
  [ModuloSistema.RELATORIOS]: 'Dashboard, custo por arroba e indicadores por método de manejo.',
  [ModuloSistema.ANIMAIS]: 'Cadastro individual de animais dentro dos lotes.',
  [ModuloSistema.SANIDADE]: 'Vacinas, medicamentos e alertas de vencimento.',
  [ModuloSistema.REPRODUCAO]: 'Estação de monta, diagnóstico de gestação, partos.',
  [ModuloSistema.ESTOQUE]: 'Controle de saldo de insumos (ração, suplemento etc.).',
  [ModuloSistema.METODOS_MANEJO]: 'Tela de gestão de métodos de manejo customizados.',
  [ModuloSistema.AREAS]: 'Cadastro de áreas de pasto, com subdivisão em piquetes e controle de altura do capim.',
  [ModuloSistema.FINANCEIRO]: 'Plano de contas, contas a pagar/receber, bancos e contatos.',
};

/**
 * O GET devolve a configuração inteira, mas o PATCH só aceita o que o
 * responsável pode editar — e recusa o resto com "property ... should not
 * exist" (validação com forbidNonWhitelisted). Recursos personalizados são
 * exclusivos do ADMIN, na tela própria; a localização do clima é editada no
 * card de previsão. Mandar tudo de volta fazia o Salvar falhar.
 */
function somenteEditavel(config: ConfiguracaoEmpresa): Partial<ConfiguracaoEmpresa> {
  const {
    recursosPersonalizados: _recursos,
    climaLocalNome: _nome,
    climaLatitude: _lat,
    climaLongitude: _lon,
    ...editavel
  } = config;
  return editavel;
}

export default function ConfiguracoesPage() {
  const toast = useToast();
  const { definirConfigEmpresa } = usePermissoes();
  const [config, setConfig] = useState<ConfiguracaoEmpresa | null>(null);
  const [erro, setErro] = useState('');
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
    try {
      const atualizado = await atualizarConfiguracaoEmpresa(somenteEditavel(config));
      setConfig(atualizado);
      definirConfigEmpresa(atualizado);
      toast.sucesso('Configurações da fazenda salvas.');
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar configurações');
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
          <div className="linha-campos linha-campos--rotulos-alinhados" style={{ maxWidth: 700 }}>
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
              <label>
                <span className="campo-toggle">
                  <input
                    type="checkbox"
                    checked={config.avisoVencimentoSanitarioAtivo}
                    onChange={() =>
                      setConfig({
                        ...config,
                        avisoVencimentoSanitarioAtivo: !config.avisoVencimentoSanitarioAtivo,
                      })
                    }
                  />
                  Aviso de vencimento sanitário (dias)
                </span>
              </label>
              <input
                className="input"
                type="number"
                disabled={!config.avisoVencimentoSanitarioAtivo}
                value={config.sanidadeDiasAvisoVencimento}
                onChange={(e) =>
                  setConfig({ ...config, sanidadeDiasAvisoVencimento: Number(e.target.value) })
                }
              />
              <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 6 }}>
                {config.avisoVencimentoSanitarioAtivo
                  ? 'Com quantos dias de antecedência a tela de Sanidade avisa de uma aplicação próxima do vencimento.'
                  : 'Desativado: a fazenda não recebe aviso de vencimento no painel nem na tela de Sanidade. O histórico continua registrado.'}
              </p>
            </div>
            <div className="campo">
              <label>
                <span className="campo-toggle">
                  <input
                    type="checkbox"
                    checked={config.alturaIdealPastoAtiva}
                    onChange={() =>
                      setConfig({ ...config, alturaIdealPastoAtiva: !config.alturaIdealPastoAtiva })
                    }
                  />
                  Altura ideal do capim (cm)
                </span>
              </label>
              <input
                className="input"
                type="number"
                disabled={!config.alturaIdealPastoAtiva}
                value={config.alturaIdealPastoPadrao}
                onChange={(e) =>
                  setConfig({ ...config, alturaIdealPastoPadrao: Number(e.target.value) })
                }
              />
              <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 6 }}>
                {config.alturaIdealPastoAtiva
                  ? 'Altura em que um piquete fica pronto pra receber o gado, se ele não tiver uma altura ideal própria definida.'
                  : 'Desativado: os piquetes deixam de mostrar o status "pronto pra receber o gado". As medições de altura continuam sendo registradas.'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
