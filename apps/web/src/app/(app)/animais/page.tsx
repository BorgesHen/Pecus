'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ModuloSistema,
  SexoAnimal,
  CategoriaAnimal,
  StatusAnimal,
  EspecieAnimal,
  LABEL_SEXO_ANIMAL,
  LABEL_CATEGORIA_ANIMAL,
  LABEL_STATUS_ANIMAL,
  LABEL_ESPECIE_ANIMAL,
  CATEGORIAS_POR_ESPECIE,
  RECURSO_OVINOS,
  IDADE_MAXIMA_MESES,
  LABEL_UNIDADE_IDADE,
  MESES_POR_UNIDADE,
  dataNascimentoPorIdade,
  idadeDoAnimal,
  type UnidadeIdade,
} from '@pecus/shared';
import { listarAnimais, criarAnimal, type AnimalComLote, type NovoAnimal } from '@/lib/animais';
import { listarLotes, type LoteComContagem } from '@/lib/lotes';
import { brData, hojeISO } from '@/lib/data';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';

const FORM_VAZIO: NovoAnimal = {
  loteId: '',
  identificador: '',
  sexo: SexoAnimal.FEMEA,
  categoria: CategoriaAnimal.BEZERRO,
  dataEntrada: new Date().toISOString().slice(0, 10),
  idadeMeses: undefined,
  pesoEntrada: undefined,
  observacao: '',
};

export default function AnimaisPage() {
  const router = useRouter();
  const toast = useToast();
  const { podeEditar, campoAtivo, temRecurso } = usePermissoes();
  const podeEditarAnimais = podeEditar(ModuloSistema.ANIMAIS);
  const temOvinos = temRecurso(RECURSO_OVINOS);

  const [animais, setAnimais] = useState<AnimalComLote[] | null>(null);
  const [lotes, setLotes] = useState<LoteComContagem[]>([]);
  const [filtroLoteId, setFiltroLoteId] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusAnimal | ''>(StatusAnimal.ATIVO);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<NovoAnimal>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  // Meses/anos é conveniência de digitação: o que vai pro backend é sempre mês.
  const [unidadeIdade, setUnidadeIdade] = useState<UnidadeIdade>('MESES');

  function carregar() {
    listarAnimais({ loteId: filtroLoteId || undefined, status: filtroStatus || undefined })
      .then(setAnimais)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar animais'));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroLoteId, filtroStatus]);

  useEffect(() => {
    listarLotes().then(setLotes).catch(() => {});
    const loteIdNaUrl = new URLSearchParams(window.location.search).get('loteId');
    if (loteIdNaUrl) setFiltroLoteId(loteIdNaUrl);
  }, []);

  /** A espécie do animal vem sempre do lote — o cadastro não escolhe, só reflete. */
  function especieDoLote(loteId: string): EspecieAnimal {
    return lotes.find((l) => l.id === loteId)?.especie ?? EspecieAnimal.BOVINO;
  }

  const especieForm = especieDoLote(form.loteId);
  const categoriasDisponiveis = CATEGORIAS_POR_ESPECIE[especieForm];

  function abrirModal() {
    setUnidadeIdade('MESES');
    const loteId = filtroLoteId || lotes[0]?.id || '';
    setForm({
      ...FORM_VAZIO,
      loteId,
      categoria: CATEGORIAS_POR_ESPECIE[especieDoLote(loteId)][0],
    });
    setModalAberto(true);
  }

  /** Trocar de lote pode trocar a espécie, então a categoria precisa ir pra uma válida. */
  function trocarLote(loteId: string) {
    const categorias = CATEGORIAS_POR_ESPECIE[especieDoLote(loteId)];
    setForm((f) => ({
      ...f,
      loteId,
      categoria: categorias.includes(f.categoria) ? f.categoria : categorias[0],
    }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      await criarAnimal(form);
      setModalAberto(false);
      toast.sucesso(`Animal "${form.identificador}" cadastrado.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar animal');
    } finally {
      setSalvando(false);
    }
  }

  const hoje = hojeISO();

  // A idade é guardada em meses; o campo mostra na unidade escolhida.
  const idadeDigitada =
    form.idadeMeses == null
      ? ''
      : String(unidadeIdade === 'ANOS' ? Math.floor(form.idadeMeses / 12) : form.idadeMeses);

  const nascimentoEstimado =
    form.idadeMeses != null ? dataNascimentoPorIdade(form.dataEntrada, form.idadeMeses) : null;

  function mudarIdade(texto: string) {
    const digitos = texto.replace(/\D/g, '');
    if (!digitos) {
      setForm((f) => ({ ...f, idadeMeses: undefined }));
      return;
    }
    const emMeses = Number(digitos) * MESES_POR_UNIDADE[unidadeIdade];
    setForm((f) => ({ ...f, idadeMeses: Math.min(emMeses, IDADE_MAXIMA_MESES) }));
  }

  /** Trocar a unidade reinterpreta o número digitado, não converte o valor. */
  function trocarUnidadeIdade(nova: UnidadeIdade) {
    const digitado = Number(idadeDigitada || 0);
    setUnidadeIdade(nova);
    setForm((f) => ({
      ...f,
      idadeMeses:
        digitado > 0 ? Math.min(digitado * MESES_POR_UNIDADE[nova], IDADE_MAXIMA_MESES) : f.idadeMeses,
    }));
  }


  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Animais</h2>
        <button className="btn" onClick={abrirModal} disabled={!podeEditarAnimais || lotes.length === 0}>
          + Novo animal
        </button>
      </div>

      <div className="linha-campos">
        <div className="campo" style={{ maxWidth: 280 }}>
          <label>Filtrar por lote</label>
          <select className="input" value={filtroLoteId} onChange={(e) => setFiltroLoteId(e.target.value)}>
            <option value="">Todos</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.identificacao}
              </option>
            ))}
          </select>
        </div>
        <div className="campo" style={{ maxWidth: 200 }}>
          <label>Status</label>
          <select
            className="input"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as StatusAnimal | '')}
          >
            <option value="">Todos</option>
            {Object.values(StatusAnimal).map((s) => (
              <option key={s} value={s}>
                {LABEL_STATUS_ANIMAL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {!animais && !erro && <p>Carregando...</p>}

      {lotes.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>
            Cadastre um lote antes de registrar animais individuais.
          </p>
        </div>
      )}

      {animais && animais.length === 0 && lotes.length > 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum animal cadastrado ainda.</p>
        </div>
      )}

      {animais && animais.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Identificador</th>
                {temOvinos && <th>Espécie</th>}
                <th>Categoria</th>
                <th>Sexo</th>
                {campoAtivo('animais.dataNascimento') && <th>Idade</th>}
                <th>Lote</th>
                <th>Status</th>
                <th>Entrada</th>
              </tr>
            </thead>
            <tbody>
              {animais.map((a) => (
                <tr key={a.id} className="linha-clicavel" onClick={() => router.push(`/animais/${a.id}`)}>
                  <td data-label="Identificador">
                    <strong>{a.identificador}</strong>
                  </td>
                  {temOvinos && <td data-label="Espécie">{LABEL_ESPECIE_ANIMAL[a.especie]}</td>}
                  <td data-label="Categoria">{LABEL_CATEGORIA_ANIMAL[a.categoria]}</td>
                  <td data-label="Sexo">{LABEL_SEXO_ANIMAL[a.sexo]}</td>
                  {campoAtivo('animais.dataNascimento') && (
                    <td data-label="Idade">{idadeDoAnimal(a, hoje)?.texto ?? '—'}</td>
                  )}
                  <td data-label="Lote">{a.lote?.identificacao ?? '—'}</td>
                  <td data-label="Status">{LABEL_STATUS_ANIMAL[a.status]}</td>
                  <td data-label="Entrada">{brData(a.dataEntrada)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo animal</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Identificador (brinco)</label>
                <input
                  className="input"
                  value={form.identificador}
                  onChange={(e) => setForm({ ...form, identificador: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Lote</label>
                <select className="input" value={form.loteId} onChange={(e) => trocarLote(e.target.value)}>
                  {lotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.identificacao}
                      {temOvinos ? ` — ${LABEL_ESPECIE_ANIMAL[l.especie]}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="linha-campos">
              <div className="campo">
                <label>Sexo</label>
                <select
                  className="input"
                  value={form.sexo}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value as SexoAnimal })}
                >
                  {Object.values(SexoAnimal).map((s) => (
                    <option key={s} value={s}>
                      {LABEL_SEXO_ANIMAL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Categoria</label>
                <select
                  className="input"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaAnimal })}
                >
                  {categoriasDisponiveis.map((c) => (
                    <option key={c} value={c}>
                      {LABEL_CATEGORIA_ANIMAL[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="linha-campos">
              <div className="campo">
                <label>Data de entrada</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={form.dataEntrada}
                  onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })}
                />
              </div>
              {campoAtivo('animais.dataNascimento') && (
                <div className="campo">
                  <label>Idade na entrada (opcional)</label>
                  <div className="simulador-campo-base">
                    <input
                      className="input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={idadeDigitada}
                      onChange={(e) => mudarIdade(e.target.value)}
                    />
                    <select
                      className="input"
                      value={unidadeIdade}
                      onChange={(e) => trocarUnidadeIdade(e.target.value as UnidadeIdade)}
                    >
                      {(['MESES', 'ANOS'] as UnidadeIdade[]).map((u) => (
                        <option key={u} value={u}>
                          {LABEL_UNIDADE_IDADE[u]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.idadeMeses != null && (
                    <p className="simulador-dica">
                      Nascimento estimado em {brData(nascimentoEstimado)} — a idade mostrada na
                      ficha vai acompanhando o tempo.
                    </p>
                  )}
                </div>
              )}
            </div>

            {campoAtivo('animais.pesoEntrada') && (
              <div className="campo">
                <label>Peso de entrada (kg, opcional)</label>
                <input
                  className="input"
                  type="number"
                  value={form.pesoEntrada ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, pesoEntrada: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            )}

            {campoAtivo('animais.observacao') && (
              <div className="campo">
                <label>Observação (opcional)</label>
                <input
                  className="input"
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
              </div>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={salvar}
                disabled={salvando || !form.identificador || !form.loteId}
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
