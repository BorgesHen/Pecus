'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ModuloSistema,
  StatusAnimal,
  LABEL_SEXO_ANIMAL,
  LABEL_CATEGORIA_ANIMAL,
  LABEL_STATUS_ANIMAL,
  CATEGORIAS_REPRODUTIVAS,
  TipoEventoSanitario,
  LABEL_TIPO_EVENTO_SANITARIO,
  TipoEventoReprodutivo,
  LABEL_TIPO_EVENTO_REPRODUTIVO,
} from '@pecus/shared';
import type { EventoSanitario } from '@pecus/shared';
import { obterAnimal, darSaidaAnimal, type AnimalComLote } from '@/lib/animais';
import {
  listarEventosPorAnimal,
  criarEventoSanitario,
  type NovoEventoSanitario,
} from '@/lib/sanidade';
import {
  listarEventosReprodutivosPorAnimal,
  criarEventoReprodutivo,
  type EventoReprodutivoComCria,
} from '@/lib/reproducao';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { hojeISO } from '@/lib/data';

export default function DetalheAnimalPage() {
  const params = useParams<{ id: string }>();
  const animalId = params.id;
  const { podeEditar, campoAtivo } = usePermissoes();
  const podeEditarAnimais = podeEditar(ModuloSistema.ANIMAIS);

  const [animal, setAnimal] = useState<AnimalComLote | null>(null);
  const [eventosSanitarios, setEventosSanitarios] = useState<EventoSanitario[] | null>(null);
  const [erro, setErro] = useState('');
  const [modalSaidaAberto, setModalSaidaAberto] = useState(false);
  const [statusSaida, setStatusSaida] = useState<StatusAnimal>(StatusAnimal.VENDIDO);
  const [dataSaida, setDataSaida] = useState(new Date().toISOString().slice(0, 10));
  const [motivoSaida, setMotivoSaida] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [modalSanidadeAberto, setModalSanidadeAberto] = useState(false);
  const [formSanidade, setFormSanidade] = useState<Omit<NovoEventoSanitario, 'animalId'>>({
    tipo: TipoEventoSanitario.VACINA,
    nome: '',
    data: new Date().toISOString().slice(0, 10),
    proximaAplicacao: '',
    observacao: '',
  });

  const [eventosReprodutivos, setEventosReprodutivos] = useState<EventoReprodutivoComCria[] | null>(null);
  const [modalReproducaoAberto, setModalReproducaoAberto] = useState(false);
  const [formReproducao, setFormReproducao] = useState({
    tipo: TipoEventoReprodutivo.DIAGNOSTICO_GESTACAO,
    data: new Date().toISOString().slice(0, 10),
    resultado: '',
    observacao: '',
  });

  function carregar() {
    obterAnimal(animalId)
      .then(setAnimal)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar animal'));
    listarEventosPorAnimal(animalId).then(setEventosSanitarios).catch(() => setEventosSanitarios(null));
    listarEventosReprodutivosPorAnimal(animalId)
      .then(setEventosReprodutivos)
      .catch(() => setEventosReprodutivos(null));
  }

  async function salvarEventoReprodutivo() {
    setSalvando(true);
    setErro('');
    try {
      await criarEventoReprodutivo({
        animalId,
        tipo: formReproducao.tipo,
        data: formReproducao.data,
        resultado: formReproducao.resultado || undefined,
        observacao: formReproducao.observacao || undefined,
      });
      setModalReproducaoAberto(false);
      setFormReproducao({
        tipo: TipoEventoReprodutivo.DIAGNOSTICO_GESTACAO,
        data: new Date().toISOString().slice(0, 10),
        resultado: '',
        observacao: '',
      });
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar evento reprodutivo');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEventoSanitario() {
    setSalvando(true);
    setErro('');
    try {
      await criarEventoSanitario({
        ...formSanidade,
        animalId,
        proximaAplicacao: formSanidade.proximaAplicacao || undefined,
        observacao: formSanidade.observacao || undefined,
      });
      setModalSanidadeAberto(false);
      setFormSanidade({
        tipo: TipoEventoSanitario.VACINA,
        nome: '',
        data: new Date().toISOString().slice(0, 10),
        proximaAplicacao: '',
        observacao: '',
      });
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar evento sanitário');
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalId]);

  async function confirmarSaida() {
    setSalvando(true);
    setErro('');
    try {
      await darSaidaAnimal(animalId, { status: statusSaida, dataSaida, motivoSaida: motivoSaida || undefined });
      setModalSaidaAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar saída');
    } finally {
      setSalvando(false);
    }
  }

  const brData = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

  if (erro && !animal) {
    return (
      <div className="container">
        <div className="erro">{erro}</div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="container">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <Link href="/animais" style={{ fontSize: 14, display: 'inline-block', marginBottom: 12 }}>
        ← Voltar
      </Link>

      <div className="topo-tela">
        <h2>{animal.identificador}</h2>
        {animal.status === StatusAnimal.ATIVO && (
          <button
            className="btn-secundario"
            onClick={() => setModalSaidaAberto(true)}
            disabled={!podeEditarAnimais}
          >
            Dar saída
          </button>
        )}
      </div>

      {erro && <div className="erro">{erro}</div>}

      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="metrica">{LABEL_CATEGORIA_ANIMAL[animal.categoria]}</div>
          <div className="metrica-label">Categoria ({LABEL_SEXO_ANIMAL[animal.sexo]})</div>
        </div>
        <div className="card">
          <div className="metrica">{animal.lote?.identificacao ?? '—'}</div>
          <div className="metrica-label">Lote</div>
        </div>
        <div className="card">
          <div className="metrica">{LABEL_STATUS_ANIMAL[animal.status]}</div>
          <div className="metrica-label">
            Status{animal.dataSaida ? ` desde ${brData(animal.dataSaida)}` : ''}
          </div>
        </div>
        <div className="card">
          <div className="metrica">{animal.pesoEntrada ? `${animal.pesoEntrada} kg` : '—'}</div>
          <div className="metrica-label">Peso de entrada</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14 }}>
          <strong>Nascimento:</strong> {brData(animal.dataNascimento)} &nbsp;•&nbsp;{' '}
          <strong>Entrada:</strong> {brData(animal.dataEntrada)}
        </p>
        {animal.observacao && (
          <p style={{ fontSize: 14, color: 'var(--texto-suave)', marginTop: 8 }}>{animal.observacao}</p>
        )}
        {animal.motivoSaida && (
          <p style={{ fontSize: 14, color: 'var(--texto-suave)', marginTop: 8 }}>
            Motivo da saída: {animal.motivoSaida}
          </p>
        )}
      </div>

      <div className="topo-tela">
        <h3>Histórico sanitário</h3>
        <button className="btn-secundario" onClick={() => setModalSanidadeAberto(true)} disabled={!podeEditarAnimais}>
          + Novo evento
        </button>
      </div>
      {!eventosSanitarios || eventosSanitarios.length === 0 ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum evento sanitário registrado ainda.</p>
        </div>
      ) : (
        <div className="tabela-wrap" style={{ marginBottom: 24 }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Nome</th>
                <th>Próxima aplicação</th>
              </tr>
            </thead>
            <tbody>
              {eventosSanitarios.map((e) => (
                <tr key={e.id}>
                  <td data-label="Data">{brData(e.data)}</td>
                  <td data-label="Tipo">{LABEL_TIPO_EVENTO_SANITARIO[e.tipo]}</td>
                  <td data-label="Nome">{e.nome}</td>
                  <td data-label="Próxima aplicação">{brData(e.proximaAplicacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalSanidadeAberto && (
        <div className="modal-overlay" onClick={() => setModalSanidadeAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo evento sanitário</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Tipo</label>
                <select
                  className="input"
                  value={formSanidade.tipo}
                  onChange={(e) =>
                    setFormSanidade({ ...formSanidade, tipo: e.target.value as TipoEventoSanitario })
                  }
                >
                  {Object.values(TipoEventoSanitario).map((t) => (
                    <option key={t} value={t}>
                      {LABEL_TIPO_EVENTO_SANITARIO[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Nome</label>
                <input
                  className="input"
                  value={formSanidade.nome}
                  onChange={(e) => setFormSanidade({ ...formSanidade, nome: e.target.value })}
                />
              </div>
            </div>

            <div className="linha-campos">
              <div className="campo">
                <label>Data</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={formSanidade.data}
                  onChange={(e) => setFormSanidade({ ...formSanidade, data: e.target.value })}
                />
              </div>
              {campoAtivo('sanidade.proximaAplicacao') && (
                <div className="campo">
                  <label>Próxima aplicação (opcional)</label>
                  <input
                    className="input"
                    type="date"
                    value={formSanidade.proximaAplicacao}
                    onChange={(e) => setFormSanidade({ ...formSanidade, proximaAplicacao: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalSanidadeAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarEventoSanitario} disabled={salvando || !formSanidade.nome}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {CATEGORIAS_REPRODUTIVAS.includes(animal.categoria) && (
        <>
          <div className="topo-tela">
            <h3>Histórico reprodutivo</h3>
            <button
              className="btn-secundario"
              onClick={() => setModalReproducaoAberto(true)}
              disabled={!podeEditarAnimais}
            >
              + Novo evento
            </button>
          </div>
          {!eventosReprodutivos || eventosReprodutivos.length === 0 ? (
            <div className="card" style={{ marginBottom: 24 }}>
              <p style={{ color: 'var(--texto-suave)' }}>Nenhum evento reprodutivo registrado ainda.</p>
            </div>
          ) : (
            <div className="tabela-wrap" style={{ marginBottom: 24 }}>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Resultado</th>
                    <th>Cria</th>
                  </tr>
                </thead>
                <tbody>
                  {eventosReprodutivos.map((e) => (
                    <tr key={e.id}>
                      <td data-label="Data">{brData(e.data)}</td>
                      <td data-label="Tipo">{LABEL_TIPO_EVENTO_REPRODUTIVO[e.tipo]}</td>
                      <td data-label="Resultado">{e.resultado ?? '—'}</td>
                      <td data-label="Cria">
                        {e.cria ? <Link href={`/animais/${e.cria.id}`}>{e.cria.identificador}</Link> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalReproducaoAberto && (
        <div className="modal-overlay" onClick={() => setModalReproducaoAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo evento reprodutivo</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Tipo</label>
                <select
                  className="input"
                  value={formReproducao.tipo}
                  onChange={(e) =>
                    setFormReproducao({ ...formReproducao, tipo: e.target.value as TipoEventoReprodutivo })
                  }
                >
                  {Object.values(TipoEventoReprodutivo).map((t) => (
                    <option key={t} value={t}>
                      {LABEL_TIPO_EVENTO_REPRODUTIVO[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Data</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={formReproducao.data}
                  onChange={(e) => setFormReproducao({ ...formReproducao, data: e.target.value })}
                />
              </div>
            </div>

            {campoAtivo('reproducao.resultado') && (
              <div className="campo">
                <label>Resultado (opcional, ex: Prenha/Vazia)</label>
                <input
                  className="input"
                  value={formReproducao.resultado}
                  onChange={(e) => setFormReproducao({ ...formReproducao, resultado: e.target.value })}
                />
              </div>
            )}

            {formReproducao.tipo === TipoEventoReprodutivo.PARTO && (
              <p style={{ fontSize: 13, color: 'var(--texto-suave)', marginBottom: 12 }}>
                Pra já cadastrar a cria nascida, registre esse parto pela tela de{' '}
                <Link href="/reproducao">Reprodução</Link>.
              </p>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalReproducaoAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarEventoReprodutivo} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSaidaAberto && (
        <div className="modal-overlay" onClick={() => setModalSaidaAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Dar saída</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Motivo</label>
                <select
                  className="input"
                  value={statusSaida}
                  onChange={(e) => setStatusSaida(e.target.value as StatusAnimal)}
                >
                  <option value={StatusAnimal.VENDIDO}>Vendido</option>
                  <option value={StatusAnimal.MORTO}>Morto</option>
                  <option value={StatusAnimal.TRANSFERIDO}>Transferido</option>
                </select>
              </div>
              <div className="campo">
                <label>Data</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={dataSaida}
                  onChange={(e) => setDataSaida(e.target.value)}
                />
              </div>
            </div>

            <div className="campo">
              <label>Observação (opcional)</label>
              <input className="input" value={motivoSaida} onChange={(e) => setMotivoSaida(e.target.value)} />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalSaidaAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={confirmarSaida} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
