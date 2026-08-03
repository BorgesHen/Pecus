'use client';

import { useEffect, useState } from 'react';
import { LocateFixed, MapPin, Pencil, Search, Trash2, X } from 'lucide-react';
import { PapelUsuario } from '@pecus/shared';
import { buscarLocais, obterPrevisao, type LocalClima, type PrevisaoDia } from '@/lib/clima';
import { atualizarConfiguracaoEmpresa } from '@/lib/empresas';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';

/** De onde vem a coordenada da previsão. */
type Origem = 'fazenda' | 'atual';

const CHAVE_ORIGEM = 'pecus_clima_origem';

/** O nome salvo é completo ("Passo Fundo, Rio Grande do Sul, Brasil"); no botão cabe só a cidade. */
function rotuloCurto(nome: string) {
  return nome.split(',')[0].trim();
}

export function PrevisaoTempo() {
  const toast = useToast();
  const { configEmpresa, definirConfigEmpresa, permissoes } = usePermissoes();

  const latFazenda = configEmpresa?.climaLatitude ?? null;
  const lonFazenda = configEmpresa?.climaLongitude ?? null;
  const temLocalFazenda = latFazenda != null && lonFazenda != null;
  const nomeFazenda = configEmpresa?.climaLocalNome ?? 'Fazenda';

  // Só quem pode alterar a configuração da fazenda define a localização dela
  // (o PATCH de /empresas/configuracao já barra o resto no servidor).
  const podeDefinir =
    permissoes?.papel === PapelUsuario.ADMIN || permissoes?.papel === PapelUsuario.RESPONSAVEL;

  const [origem, setOrigem] = useState<Origem | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [dias, setDias] = useState<PrevisaoDia[] | null>(null);
  const [erro, setErro] = useState('');
  const [permissaoNegada, setPermissaoNegada] = useState(false);

  const [editando, setEditando] = useState(false);
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<LocalClima[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erroEditor, setErroEditor] = useState('');
  const [salvandoLocal, setSalvandoLocal] = useState(false);

  // Decide a origem depois de montar: localStorage não existe no servidor.
  // Padrão é a fazenda quando ela tem localização — assim o painel não pede
  // GPS toda vez pra quem já disse de onde quer ver a previsão.
  useEffect(() => {
    if (origem !== null) return;
    const salva = localStorage.getItem(CHAVE_ORIGEM);
    const valida = salva === 'fazenda' || salva === 'atual' ? (salva as Origem) : null;
    if (valida === 'fazenda' && !temLocalFazenda) {
      setOrigem('atual');
      return;
    }
    setOrigem(valida ?? (temLocalFazenda ? 'fazenda' : 'atual'));
  }, [origem, temLocalFazenda]);

  useEffect(() => {
    if (origem === null) return;

    let cancelado = false;
    setErro('');
    setPermissaoNegada(false);
    setDias(null);

    const aplicar = (r: { dias: PrevisaoDia[] }) => !cancelado && setDias(r.dias);
    const falhar = (e: unknown) =>
      !cancelado && setErro(e instanceof Error ? e.message : 'Erro ao buscar previsão do tempo');

    if (origem === 'fazenda') {
      if (latFazenda == null || lonFazenda == null) return;
      obterPrevisao(latFazenda, lonFazenda).then(aplicar).catch(falhar);
      return () => {
        cancelado = true;
      };
    }

    if (!('geolocation' in navigator)) {
      setErro('Seu navegador não suporta geolocalização.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelado) return;
        obterPrevisao(pos.coords.latitude, pos.coords.longitude).then(aplicar).catch(falhar);
      },
      (err) => {
        if (cancelado) return;
        if (err.code === err.PERMISSION_DENIED) setPermissaoNegada(true);
        else setErro('Não foi possível obter sua localização.');
      },
      { timeout: 10000 },
    );

    return () => {
      cancelado = true;
    };
  }, [origem, latFazenda, lonFazenda, tentativa]);

  function trocarOrigem(nova: Origem) {
    if (nova === origem) return;
    localStorage.setItem(CHAVE_ORIGEM, nova);
    setOrigem(nova);
  }

  function abrirEditor() {
    setTermo('');
    setResultados(null);
    setErroEditor('');
    setEditando(true);
  }

  async function buscar() {
    if (termo.trim().length < 2) return;
    setBuscando(true);
    setErroEditor('');
    setResultados(null);
    try {
      const r = await buscarLocais(termo);
      setResultados(r.locais);
    } catch (e) {
      setErroEditor(e instanceof Error ? e.message : 'Erro ao buscar localidades');
    } finally {
      setBuscando(false);
    }
  }

  async function salvarLocal(local: LocalClima) {
    setSalvandoLocal(true);
    setErroEditor('');
    try {
      const config = await atualizarConfiguracaoEmpresa({
        climaLocalNome: [local.nome, local.detalhe].filter(Boolean).join(', '),
        climaLatitude: local.latitude,
        climaLongitude: local.longitude,
      });
      definirConfigEmpresa(config);
      localStorage.setItem(CHAVE_ORIGEM, 'fazenda');
      setOrigem('fazenda');
      setEditando(false);
      toast.sucesso(`Previsão da fazenda agora é de ${local.nome}.`);
    } catch (e) {
      // Fica no painel do editor (e não em toast) porque o erro é do formulário
      // que está aberto ali — o usuário precisa dele junto do campo.
      setErroEditor(e instanceof Error ? e.message : 'Erro ao salvar a localização');
    } finally {
      setSalvandoLocal(false);
    }
  }

  async function removerLocal() {
    setSalvandoLocal(true);
    setErroEditor('');
    try {
      const config = await atualizarConfiguracaoEmpresa({
        climaLocalNome: null,
        climaLatitude: null,
        climaLongitude: null,
      });
      definirConfigEmpresa(config);
      localStorage.setItem(CHAVE_ORIGEM, 'atual');
      setOrigem('atual');
      setEditando(false);
      toast.sucesso('Localização da fazenda removida.');
    } catch (e) {
      setErroEditor(e instanceof Error ? e.message : 'Erro ao remover a localização');
    } finally {
      setSalvandoLocal(false);
    }
  }

  const diaSemana = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const diaMes = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="card">
      <div className="clima-cabecalho">
        <strong>Previsão do tempo (7 dias)</strong>

        <div className="clima-acoes">
          {temLocalFazenda && (
            <div className="clima-origem" role="group" aria-label="Local da previsão">
              <button
                type="button"
                className={`clima-origem-botao ${origem === 'fazenda' ? 'clima-origem-botao--ativo' : ''}`}
                onClick={() => trocarOrigem('fazenda')}
                title={nomeFazenda}
                aria-pressed={origem === 'fazenda'}
              >
                <MapPin size={14} aria-hidden />
                {rotuloCurto(nomeFazenda)}
              </button>
              <button
                type="button"
                className={`clima-origem-botao ${origem === 'atual' ? 'clima-origem-botao--ativo' : ''}`}
                onClick={() => trocarOrigem('atual')}
                title="Usar a localização deste aparelho"
                aria-pressed={origem === 'atual'}
              >
                <LocateFixed size={14} aria-hidden />
                Onde estou
              </button>
            </div>
          )}

          {podeDefinir && (
            <button
              type="button"
              className="clima-editar"
              onClick={() => (editando ? setEditando(false) : abrirEditor())}
              title={temLocalFazenda ? 'Alterar a localização da fazenda' : 'Definir a localização da fazenda'}
              aria-expanded={editando}
            >
              {editando ? <X size={15} aria-hidden /> : <Pencil size={15} aria-hidden />}
              {!temLocalFazenda && !editando && <span>Definir local da fazenda</span>}
            </button>
          )}

          {(erro || permissaoNegada) && (
            <button
              className="btn-secundario"
              onClick={() => setTentativa((t) => t + 1)}
              style={{ padding: '6px 12px', fontSize: 13 }}
            >
              Tentar de novo
            </button>
          )}
        </div>
      </div>

      {editando && (
        <div className="clima-editor">
          <p className="clima-editor-ajuda">
            Busque a cidade da fazenda. Ela fica salva pra todo mundo que usa esta fazenda, e você
            pode alternar entre ela e a localização deste aparelho.
          </p>

          <div className="clima-busca">
            <input
              className="input"
              placeholder="ex: Passo Fundo"
              value={termo}
              autoFocus
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
            />
            <button
              className="btn"
              onClick={buscar}
              disabled={buscando || salvandoLocal || termo.trim().length < 2}
            >
              <Search size={15} aria-hidden /> {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {erroEditor && <p className="clima-editor-erro">{erroEditor}</p>}

          {resultados && resultados.length === 0 && (
            <p className="clima-editor-ajuda">Nenhuma localidade encontrada com esse nome.</p>
          )}

          {resultados && resultados.length > 0 && (
            <div className="clima-resultados">
              {resultados.map((l) => (
                <button
                  key={`${l.latitude},${l.longitude}`}
                  type="button"
                  className="clima-resultado"
                  disabled={salvandoLocal}
                  onClick={() => salvarLocal(l)}
                >
                  <MapPin size={15} aria-hidden />
                  <span>
                    <strong>{l.nome}</strong>
                    {l.detalhe && <em>{l.detalhe}</em>}
                  </span>
                </button>
              ))}
            </div>
          )}

          {temLocalFazenda && (
            <button
              type="button"
              className="clima-remover"
              onClick={removerLocal}
              disabled={salvandoLocal}
            >
              <Trash2 size={14} aria-hidden /> Remover “{rotuloCurto(nomeFazenda)}”
            </button>
          )}
        </div>
      )}

      {origem === 'fazenda' && temLocalFazenda && (
        <p className="clima-local-atual">
          <MapPin size={13} aria-hidden /> {nomeFazenda}
        </p>
      )}

      {permissaoNegada && (
        <p style={{ color: 'var(--texto-suave)', fontSize: 14 }}>
          Permita o acesso à localização no navegador pra ver a previsão da sua região
          {temLocalFazenda ? ' — ou volte pra localização da fazenda.' : '.'}
        </p>
      )}
      {erro && !permissaoNegada && <p style={{ color: 'var(--erro)', fontSize: 14 }}>{erro}</p>}
      {!dias && !erro && !permissaoNegada && (
        <p style={{ color: 'var(--texto-suave)' }}>
          {origem === 'atual' ? 'Buscando sua localização...' : 'Carregando previsão...'}
        </p>
      )}

      {dias && (
        <div className="previsao-tempo-grade">
          {dias.map((d) => (
            <div key={d.data} className="previsao-tempo-dia" title={d.label}>
              <span className="previsao-tempo-dia-semana">{diaSemana(d.data)}</span>
              <span className="previsao-tempo-dia-data">{diaMes(d.data)}</span>
              <span className="previsao-tempo-icone">{d.icone}</span>
              <span className="previsao-tempo-temps">
                <strong>{Math.round(d.tempMax)}°</strong> {Math.round(d.tempMin)}°
              </span>
              <span className="previsao-tempo-chuva">💧 {d.probabilidadeChuva}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
