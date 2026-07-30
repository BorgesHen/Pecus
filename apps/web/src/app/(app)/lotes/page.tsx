'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ModuloSistema,
  TIPOS_METODO_A_PASTO,
  EspecieAnimal,
  LABEL_ESPECIE_ANIMAL,
  RECURSO_OVINOS,
  type MetodoManejo,
} from '@pecus/shared';
import {
  listarLotes,
  criarLote,
  removerLote,
  listarMetodosManejo,
  type LoteComContagem,
  type NovoLote,
} from '@/lib/lotes';
import { listarAreas, type AreaComContagem } from '@/lib/areas';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';
import { hojeISO } from '@/lib/data';

const FORM_VAZIO: NovoLote = {
  identificacao: '',
  especie: EspecieAnimal.BOVINO,
  dataAquisicao: hojeISO(),
  quantidadeAnimais: 1,
  pesoMedioEntrada: undefined,
  metodoManejoId: undefined,
  areaId: undefined,
  rendimentoCarcaca: undefined,
  gmdEsperado: undefined,
};

export default function LotesPage() {
  const router = useRouter();
  const { podeEditar, campoAtivo, temRecurso } = usePermissoes();
  const podeEditarLotes = podeEditar(ModuloSistema.LOTES);
  // Fazenda que só cria gado nem vê o seletor de espécie — a tela fica igual à de antes.
  const temOvinos = temRecurso(RECURSO_OVINOS);
  const [lotes, setLotes] = useState<LoteComContagem[] | null>(null);
  const [metodos, setMetodos] = useState<MetodoManejo[]>([]);
  const [areas, setAreas] = useState<AreaComContagem[]>([]);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<NovoLote>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<LoteComContagem | null>(null);

  function carregar() {
    listarLotes()
      .then(setLotes)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar lotes'));
  }

  useEffect(() => {
    carregar();
    listarMetodosManejo().then(setMetodos).catch(() => {});
    listarAreas().then(setAreas).catch(() => {});
  }, []);

  function abrirModal() {
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      await criarLote(form);
      setModalAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar lote');
    } finally {
      setSalvando(false);
    }
  }

  function pedirExclusao(lote: LoteComContagem, e: React.MouseEvent) {
    e.stopPropagation();
    setParaExcluir(lote);
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    try {
      await removerLote(paraExcluir.id);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir lote');
    } finally {
      setParaExcluir(null);
    }
  }

  const brData = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const metodoSelecionado = metodos.find((m) => m.id === form.metodoManejoId);
  const usaPasto = metodoSelecionado ? TIPOS_METODO_A_PASTO.includes(metodoSelecionado.tipo) : false;

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Lotes</h2>
        <button className="btn" onClick={abrirModal} disabled={!podeEditarLotes}>
          + Novo lote
        </button>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {!lotes && !erro && <p>Carregando...</p>}

      {lotes && lotes.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>
            Nenhum lote cadastrado ainda. Comece criando o primeiro.
          </p>
        </div>
      )}

      {lotes && lotes.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Identificação</th>
                {temOvinos && <th>Espécie</th>}
                <th>Aquisição</th>
                <th>Animais</th>
                <th>Peso entrada</th>
                <th>Método</th>
                <th>Pesagens</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((lote) => (
                <tr
                  key={lote.id}
                  className="linha-clicavel"
                  onClick={() => router.push(`/lotes/${lote.id}`)}
                >
                  <td data-label="Identificação">
                    <strong>{lote.identificacao}</strong>
                  </td>
                  {temOvinos && (
                    <td data-label="Espécie">{LABEL_ESPECIE_ANIMAL[lote.especie]}</td>
                  )}
                  <td data-label="Aquisição">{brData(lote.dataAquisicao)}</td>
                  <td data-label="Animais">{lote.quantidadeAnimais}</td>
                  <td data-label="Peso entrada">
                    {lote.pesoMedioEntrada ? `${lote.pesoMedioEntrada} kg` : '—'}
                  </td>
                  <td data-label="Método">{lote.metodoManejo?.nome ?? '—'}</td>
                  <td data-label="Pesagens">{lote._count.pesagens}</td>
                  <td data-label="">
                    <button
                      className="btn-perigo"
                      onClick={(e) => pedirExclusao(lote, e)}
                      disabled={!podeEditarLotes}
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

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo lote</h3>

            <div className="campo">
              <label>Identificação</label>
              <input
                className="input"
                value={form.identificacao}
                onChange={(e) => setForm({ ...form, identificacao: e.target.value })}
              />
            </div>

            {temOvinos && (
              <div className="campo">
                <label>Espécie</label>
                <select
                  className="input"
                  value={form.especie ?? EspecieAnimal.BOVINO}
                  onChange={(e) => setForm({ ...form, especie: e.target.value as EspecieAnimal })}
                >
                  {Object.values(EspecieAnimal).map((especie) => (
                    <option key={especie} value={especie}>
                      {LABEL_ESPECIE_ANIMAL[especie]}
                    </option>
                  ))}
                </select>
                <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 6 }}>
                  Define as categorias dos animais e como o custo é calculado (arroba pra bovino,
                  kg de carcaça pra ovino). Não muda depois que o lote tiver animais.
                </p>
              </div>
            )}

            <div className="linha-campos">
              <div className="campo">
                <label>Data de aquisição</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={form.dataAquisicao}
                  onChange={(e) => setForm({ ...form, dataAquisicao: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Quantidade de animais</label>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.quantidadeAnimais === 0 ? '' : form.quantidadeAnimais}
                  onChange={(e) => {
                    const digitos = e.target.value.replace(/\D/g, '');
                    const numero = digitos ? Math.min(Number(digitos), 100000) : 0;
                    setForm({ ...form, quantidadeAnimais: numero });
                  }}
                />
              </div>
            </div>

            <div className="linha-campos">
              {campoAtivo('lotes.pesoMedioEntrada') && (
                <div className="campo">
                  <label>Peso médio de entrada (kg)</label>
                  <input
                    className="input"
                    type="number"
                    value={form.pesoMedioEntrada ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pesoMedioEntrada: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              )}
              {campoAtivo('lotes.metodoManejoId') && (
                <div className="campo">
                  <label>Método de manejo</label>
                  <select
                    className="input"
                    value={form.metodoManejoId ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, metodoManejoId: e.target.value || undefined })
                    }
                  >
                    <option value="">Não definido</option>
                    {metodos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="linha-campos">
              {campoAtivo('lotes.rendimentoCarcaca') && (
                <div className="campo">
                  <label>Rendimento de carcaça (%)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="52 (padrão)"
                    value={form.rendimentoCarcaca ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rendimentoCarcaca: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              )}
              {campoAtivo('lotes.gmdEsperado') && (
                <div className="campo">
                  <label>GMD esperado (kg/dia)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={form.gmdEsperado ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gmdEsperado: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              )}
            </div>

            {usaPasto && campoAtivo('lotes.areaId') && (
              <div className="campo">
                <label>Área</label>
                <select
                  className="input"
                  value={form.areaId ?? ''}
                  onChange={(e) => setForm({ ...form, areaId: e.target.value || undefined })}
                >
                  <option value="">Não definida</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paraExcluir && (
        <PopupConfirmacao
          titulo="Excluir lote?"
          mensagem={`Pesagens e gastos vinculados a "${paraExcluir.identificacao}" também serão removidos. Esta ação não pode ser desfeita.`}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </div>
  );
}
