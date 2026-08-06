'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  EntidadeAtividade,
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
  idadeDoAnimal,
  ESPECIE_CONFIG,
  formatarGmd,
  formatarQuantidade,
  quantidadeLegivel,
  PESO_MAXIMO_KG,
} from '@pecus/shared';
import type { EventoSanitario } from '@pecus/shared';
import {
  obterAnimal,
  darSaidaAnimal,
  obterAbateDoAnimal,
  obterCustoDoAnimal,
  obterHistoricoPeso,
  criarPesagemAnimal,
  removerPesagemAnimal,
  type AnimalComLote,
  type HistoricoPesoAnimal,
  type AbateDoAnimal as AbateDoAnimalDados,
  type CustoAnimal,
  type PesagemDoAnimal,
} from '@/lib/animais';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';
import {
  listarEventosPorAnimal,
  criarEventoSanitario,
  type EventoSanitarioComInsumo,
} from '@/lib/sanidade';
import {
  listarEventosReprodutivosPorAnimal,
  criarEventoReprodutivo,
  type EventoReprodutivoComCria,
} from '@/lib/reproducao';
import { BotaoHistorico } from '@/components/BotaoHistorico';
import { CustoDoAnimal } from '@/components/CustoDoAnimal';
import { AbateDoAnimal } from '@/components/AbateDoAnimal';
import { CampoInsumoAplicado } from '@/components/CampoInsumoAplicado';
import { listarInsumos, type InsumoComSaldo } from '@/lib/insumos';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';
import { brData, hojeISO } from '@/lib/data';
import { brlOuTraco } from '@/lib/formato';

/**
 * "5 ml de Ivermectina" a partir do que está gravado.
 *
 * A quantidade fica no banco na unidade de CADASTRO do insumo (0,005 quando se
 * aplicou 5 ml de um produto em litro), então a conversão de volta precisa da
 * unidade do insumo — não da unidade digitada.
 */
function descreverInsumoAplicado(evento: EventoSanitarioComInsumo): string {
  if (!evento.insumo) return '—';
  if (evento.quantidadeInsumo == null) return evento.insumo.nome;
  const legivel = quantidadeLegivel(evento.quantidadeInsumo, evento.insumo.unidade);
  return `${formatarQuantidade(legivel.quantidade, legivel.unidade)} de ${evento.insumo.nome}`;
}

export default function DetalheAnimalPage() {
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const animalId = params.id;
  const { podeEditar, podeAcessar, campoAtivo } = usePermissoes();
  const podeEditarAnimais = podeEditar(ModuloSistema.ANIMAIS);
  // Registrar peso é permissão de Pesagens, como nas pesagens de lote. Sem nem
  // o "ver" do módulo, a ficha não mostra peso nenhum — em vez de mostrar "—",
  // que pareceria animal sem pesagem.
  const podeRegistrarPesagem = podeEditar(ModuloSistema.PESAGENS);
  // O custo é informação financeira (compra do lote, gastos rateados), então
  // segue a permissão de Gastos e não a de Animais — igual à rota.
  const podeVerCusto = podeAcessar(ModuloSistema.GASTOS);
  const podeVerPesagens = podeAcessar(ModuloSistema.PESAGENS);

  const [animal, setAnimal] = useState<AnimalComLote | null>(null);
  const [eventosSanitarios, setEventosSanitarios] = useState<EventoSanitarioComInsumo[] | null>(null);
  const [erro, setErro] = useState('');
  const [modalSaidaAberto, setModalSaidaAberto] = useState(false);
  const [statusSaida, setStatusSaida] = useState<StatusAnimal>(StatusAnimal.VENDIDO);
  const [dataSaida, setDataSaida] = useState(new Date().toISOString().slice(0, 10));
  const [motivoSaida, setMotivoSaida] = useState('');
  const [pesoSaida, setPesoSaida] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Pesagens individuais e o GMD que sai delas.
  const [historicoPeso, setHistoricoPeso] = useState<HistoricoPesoAnimal | null>(null);
  const [modalPesagemAberto, setModalPesagemAberto] = useState(false);
  const [formPesagem, setFormPesagem] = useState({ data: hojeISO(), peso: '', observacao: '' });
  const [pesagemParaExcluir, setPesagemParaExcluir] = useState<PesagemDoAnimal | null>(null);
  const [custo, setCusto] = useState<CustoAnimal | null>(null);
  const [abate, setAbate] = useState<AbateDoAnimalDados | null>(null);
  const [insumos, setInsumos] = useState<InsumoComSaldo[]>([]);

  const [modalSanidadeAberto, setModalSanidadeAberto] = useState(false);
  // Tipo próprio do formulário, e não o do DTO: no formulário a quantidade
  // vazia é '' (input controlado) e no DTO é undefined. Misturar os dois é o que
  // faz o campo virar NaN ao apagar o número.
  const [formSanidade, setFormSanidade] = useState({
    tipo: TipoEventoSanitario.VACINA,
    nome: '',
    data: new Date().toISOString().slice(0, 10),
    proximaAplicacao: '',
    observacao: '',
    insumoId: '',
    quantidadeInsumo: '' as number | '',
    unidadeInsumo: '',
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
    // Só busca se o módulo Pesagens estiver liberado: sem permissão a rota
    // responde 403, e um erro previsível não precisa virar requisição.
    if (podeVerPesagens) {
      obterHistoricoPeso(animalId).then(setHistoricoPeso).catch(() => setHistoricoPeso(null));
    }
    // Mesmo critério do peso: sem a permissão de Gastos a rota responde 403, e
    // um erro previsível não precisa virar requisição.
    if (podeVerCusto) {
      obterCustoDoAnimal(animalId).then(setCusto).catch(() => setCusto(null));
    }
    // Abate é dado do módulo Animais, então quem abre a ficha já pode ver.
    obterAbateDoAnimal(animalId).then(setAbate).catch(() => setAbate(null));
  }

  async function salvarPesagem() {
    setSalvando(true);
    const peso = Number(formPesagem.peso);
    try {
      await criarPesagemAnimal(animalId, {
        data: formPesagem.data,
        peso,
        observacao: formPesagem.observacao || undefined,
      });
      setModalPesagemAberto(false);
      toast.sucesso(`Pesagem de ${peso} kg registrada.`);
      setFormPesagem({ data: hojeISO(), peso: '', observacao: '' });
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao registrar pesagem');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusaoPesagem() {
    if (!pesagemParaExcluir) return;
    const excluida = pesagemParaExcluir;
    try {
      await removerPesagemAnimal(animalId, excluida.id);
      toast.sucesso(`Pesagem de ${excluida.peso} kg excluída.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao excluir pesagem');
    } finally {
      setPesagemParaExcluir(null);
    }
  }

  async function salvarEventoReprodutivo() {
    setSalvando(true);
    const rotulo = LABEL_TIPO_EVENTO_REPRODUTIVO[formReproducao.tipo];
    try {
      await criarEventoReprodutivo({
        animalId,
        tipo: formReproducao.tipo,
        data: formReproducao.data,
        resultado: formReproducao.resultado || undefined,
        observacao: formReproducao.observacao || undefined,
      });
      setModalReproducaoAberto(false);
      toast.sucesso(`${rotulo} registrado neste animal.`);
      setFormReproducao({
        tipo: TipoEventoReprodutivo.DIAGNOSTICO_GESTACAO,
        data: new Date().toISOString().slice(0, 10),
        resultado: '',
        observacao: '',
      });
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar evento reprodutivo');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEventoSanitario() {
    setSalvando(true);
    const rotulo = LABEL_TIPO_EVENTO_SANITARIO[formSanidade.tipo];
    const nomeEvento = formSanidade.nome;
    try {
      const { insumoId, quantidadeInsumo, unidadeInsumo, ...campos } = formSanidade;
      const evento = await criarEventoSanitario({
        ...campos,
        animalId,
        proximaAplicacao: campos.proximaAplicacao || undefined,
        observacao: campos.observacao || undefined,
        // Os três andam juntos: sem insumo escolhido não há baixa nem custo, e o
        // servidor recusa insumo sem quantidade.
        ...(insumoId && quantidadeInsumo !== ''
          ? { insumoId, quantidadeInsumo: Number(quantidadeInsumo), unidadeInsumo: unidadeInsumo || undefined }
          : {}),
      });
      setModalSanidadeAberto(false);
      const custoDoEvento = evento.custo != null ? ` Custo do insumo: ${brlOuTraco(evento.custo)}.` : '';
      toast.sucesso(`${rotulo} "${nomeEvento}" registrada neste animal.${custoDoEvento}`);
      // Aviso é alerta, não erro: o evento foi gravado (estoque negativo, ou
      // insumo sem valor de compra).
      if (evento.aviso) toast.erro(evento.aviso);
      setFormSanidade({
        tipo: TipoEventoSanitario.VACINA,
        nome: '',
        data: new Date().toISOString().slice(0, 10),
        proximaAplicacao: '',
        observacao: '',
        insumoId: '',
        quantidadeInsumo: '',
        unidadeInsumo: '',
      });
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar evento sanitário');
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    carregar();
    // Falha em silêncio: sem o módulo Estoque a rota responde 403 e o campo de
    // insumo simplesmente não aparece — o manejo continua registrável.
    listarInsumos().then(setInsumos).catch(() => setInsumos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalId]);

  async function confirmarSaida() {
    setSalvando(true);
    try {
      await darSaidaAnimal(animalId, {
        status: statusSaida,
        dataSaida,
        motivoSaida: motivoSaida || undefined,
        // O peso da saída entra como pesagem na data da saída, fechando o GMD.
        pesoSaida: pesoSaida ? Number(pesoSaida) : undefined,
      });
      setModalSaidaAberto(false);
      toast.sucesso(`Saída registrada: ${LABEL_STATUS_ANIMAL[statusSaida]}.`);
      setPesoSaida('');
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao registrar saída');
    } finally {
      setSalvando(false);
    }
  }

  const idade = animal ? idadeDoAnimal(animal, hojeISO()) : null;

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

  const gmd = historicoPeso?.gmd ?? null;
  // Último ponto da linha do tempo = peso atual do animal (e, depois da saída,
  // o peso de saída). Já vem calculado do servidor, junto do GMD.
  const ultimoPonto = gmd?.pontos[gmd.pontos.length - 1] ?? null;
  // Ovino é acompanhado em gramas por dia; bovino em quilos — ver ESPECIE_CONFIG.
  const gmdEmGramas = ESPECIE_CONFIG[animal.especie].gmdEmGramas;
  const mostrarGmd = (kgPorDia: number) => formatarGmd(kgPorDia, gmdEmGramas);
  const saiu = !!animal.dataSaida;
  // Os pontos do GMD não carregam a observação (o cálculo não precisa dela),
  // então ela é buscada pelo id — é o que rotula a linha "Peso de saída".
  const observacaoPorPesagem = new Map(
    (historicoPeso?.pesagens ?? []).map((p) => [p.id, p.observacao ?? '']),
  );

  return (
    <div className="container">
      <Link href="/animais" className="link-voltar">
        ← Voltar
      </Link>

      <div className="topo-tela">
        <h2>{animal.identificador}</h2>
        <div className="acoes-celula">
          {/* "Alterações": a tela já tem "Histórico sanitário" e "Histórico
              reprodutivo", então um botão só "Histórico" seria ambíguo. */}
          {/* Animal + Pesagem: o histórico do bicho junta as edições dele com
              o cadastro e a exclusão das pesagens. Quem não tem o módulo
              Pesagens recebe só as linhas de Animais (a rota descarta). */}
          <BotaoHistorico
            entidade={[EntidadeAtividade.ANIMAL, EntidadeAtividade.PESAGEM]}
            registroId={animal.id}
            rotulo="Alterações"
            titulo={`Histórico do animal ${animal.identificador}`}
          />
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
        {podeVerPesagens && (
          <>
            <div className="card">
              <div className="metrica">{ultimoPonto ? `${ultimoPonto.peso} kg` : '—'}</div>
              <div className="metrica-label">
                {saiu ? 'Peso de saída' : 'Peso atual'}
                {animal.pesoEntrada != null && ultimoPonto && !ultimoPonto.ehEntrada
                  ? ` (entrada: ${animal.pesoEntrada} kg)`
                  : ''}
              </div>
            </div>
            <div className="card">
              <div className="metrica">{gmd?.gmd != null ? mostrarGmd(gmd.gmd) : '—'}</div>
              <div className="metrica-label">
                {/* Enquanto o animal está na fazenda o número muda a cada
                    pesagem; depois da saída ele está fechado. Dizer qual dos
                    dois é evita ler uma prévia como resultado final. */}
                {gmd?.gmd == null ? 'GMD' : gmd.previa ? 'GMD (prévia)' : 'GMD final'}
                {gmd?.dias ? ` · ${gmd.dias} dias` : ''}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14 }}>
          {/* Idade recalculada a cada abertura da ficha — o número não envelhece
              errado como aconteceria se a idade fosse gravada como número. */}
          <strong>Idade:</strong> {idade ? idade.texto : '—'} &nbsp;•&nbsp;{' '}
          <strong>Nascimento:</strong> {brData(animal.dataNascimento)}
          {animal.dataNascimento && <span style={{ color: 'var(--texto-suave)' }}> (estimado)</span>}
          &nbsp;•&nbsp; <strong>Entrada:</strong> {brData(animal.dataEntrada)}
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

      {/* Abate antes do custo: é o desfecho do animal, e quando falta a carcaça
          o card aparece em estado pendente — a saída abre esta etapa, não fecha
          o registro. */}
      {abate && (
        <AbateDoAnimal
          animalId={animalId}
          especie={animal.especie}
          dataSaida={animal.dataSaida ?? null}
          pesoSaida={ultimoPonto?.peso ?? null}
          abate={abate}
          podeEditar={podeEditarAnimais}
          onMudou={carregar}
        />
      )}

      {/* Custo antes das pesagens: é o número que resume o animal, e ele
          depende do que está lançado abaixo (remédio, exame). */}
      {podeVerCusto && custo && <CustoDoAnimal custo={custo} />}

      {/* Peso e GMD pertencem ao módulo Pesagens: sem acesso a ele, a
          seção não aparece — melhor do que mostrar "nenhuma pesagem",
          que faria parecer animal sem registro. */}
      {podeVerPesagens && (
        <>
        <div className="topo-tela">
          <h3>Pesagens</h3>
          <button
            className="btn-secundario"
            onClick={() => setModalPesagemAberto(true)}
            disabled={!podeRegistrarPesagem}
          >
            + Nova pesagem
          </button>
        </div>

        {gmd?.mensagem && (
          <p style={{ color: 'var(--texto-suave)', marginBottom: 12, fontSize: 14 }}>{gmd.mensagem}</p>
        )}

        {!gmd || gmd.pontos.length === 0 ? (
          <div className="card" style={{ marginBottom: 24 }}>
            <p style={{ color: 'var(--texto-suave)' }}>Nenhuma pesagem registrada ainda.</p>
          </div>
        ) : (
          <div className="tabela-wrap" style={{ marginBottom: 24 }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Peso</th>
                  <th>Ganho</th>
                  <th>GMD do período</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {/* Da pesagem mais recente pra mais antiga, terminando na entrada.
                    O GMD por período é o que mostra se o ganho acelerou ou caiu —
                    a média geral do card esconde isso. */}
                {[...gmd.pontos].reverse().map((ponto) => (
                  <tr key={ponto.pesagemId ?? 'entrada'}>
                    <td data-label="Data">
                      {brData(ponto.data)}
                      {ponto.ehEntrada && (
                        <span style={{ color: 'var(--texto-suave)' }}> (entrada)</span>
                      )}
                      {ponto.pesagemId && observacaoPorPesagem.get(ponto.pesagemId) && (
                        <span style={{ color: 'var(--texto-suave)' }}>
                          {' '}
                          ({observacaoPorPesagem.get(ponto.pesagemId)})
                        </span>
                      )}
                    </td>
                    <td data-label="Peso">{ponto.peso} kg</td>
                    <td data-label="Ganho">
                      {ponto.ganhoDoPeriodo == null
                        ? '—'
                        : `${ponto.ganhoDoPeriodo > 0 ? '+' : ''}${ponto.ganhoDoPeriodo} kg em ${ponto.diasDoPeriodo} dias`}
                    </td>
                    <td data-label="GMD do período">
                      {ponto.gmdDoPeriodo == null ? '—' : mostrarGmd(ponto.gmdDoPeriodo)}
                    </td>
                    <td data-label="">
                      {/* A entrada não é pesagem: se sair, tem que sair pela
                          edição do animal. */}
                      {ponto.pesagemId && (
                        <button
                          className="btn-perigo"
                          onClick={() =>
                            setPesagemParaExcluir({
                              id: ponto.pesagemId!,
                              data: ponto.data,
                              peso: ponto.peso,
                            })
                          }
                          disabled={!podeRegistrarPesagem}
                        >
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>
      )}

      {modalPesagemAberto && (
        <div className="modal-overlay" onClick={() => setModalPesagemAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nova pesagem</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Data</label>
                <input
                  className="input"
                  type="date"
                  // A janela vai da entrada até hoje — ou até a saída, se o
                  // animal já saiu (aí só cabe completar pesagem esquecida).
                  // O backend recusa fora disso; barrar aqui evita a viagem.
                  min={animal.dataEntrada.slice(0, 10)}
                  max={saiu ? animal.dataSaida!.slice(0, 10) : hojeISO()}
                  value={formPesagem.data}
                  onChange={(e) => setFormPesagem({ ...formPesagem, data: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Peso (kg)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={PESO_MAXIMO_KG}
                  step="0.1"
                  value={formPesagem.peso}
                  onChange={(e) => setFormPesagem({ ...formPesagem, peso: e.target.value })}
                />
              </div>
            </div>

            <div className="campo">
              <label>Observação (opcional)</label>
              <input
                className="input"
                value={formPesagem.observacao}
                onChange={(e) => setFormPesagem({ ...formPesagem, observacao: e.target.value })}
              />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalPesagemAberto(false)}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={salvarPesagem}
                disabled={salvando || !formPesagem.peso || Number(formPesagem.peso) <= 0}
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pesagemParaExcluir && (
        <PopupConfirmacao
          titulo="Excluir pesagem?"
          mensagem={`A pesagem de ${pesagemParaExcluir.peso} kg de ${brData(
            pesagemParaExcluir.data,
          )} será removida e o GMD será recalculado.`}
          onConfirmar={confirmarExclusaoPesagem}
          onCancelar={() => setPesagemParaExcluir(null)}
        />
      )}

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
                <th>Insumo aplicado</th>
                {/* O custo é dinheiro: só aparece pra quem tem Gastos, igual ao
                    card de custo acima. */}
                {podeVerCusto && <th>Custo</th>}
                <th>Próxima aplicação</th>
              </tr>
            </thead>
            <tbody>
              {eventosSanitarios.map((e) => (
                <tr key={e.id}>
                  <td data-label="Data">{brData(e.data)}</td>
                  <td data-label="Tipo">{LABEL_TIPO_EVENTO_SANITARIO[e.tipo]}</td>
                  <td data-label="Nome">{e.nome}</td>
                  <td data-label="Insumo aplicado">{descreverInsumoAplicado(e)}</td>
                  {podeVerCusto && <td data-label="Custo">{brlOuTraco(e.custo ?? null)}</td>}
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

            <CampoInsumoAplicado
              insumos={insumos}
              valor={{
                insumoId: formSanidade.insumoId,
                quantidade: formSanidade.quantidadeInsumo,
                unidade: formSanidade.unidadeInsumo,
              }}
              onChange={(v) =>
                setFormSanidade({
                  ...formSanidade,
                  insumoId: v.insumoId,
                  quantidadeInsumo: v.quantidade,
                  unidadeInsumo: v.unidade,
                })
              }
            />

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

            <div className="linha-campos">
              <div className="campo">
                <label>Peso na saída (kg, opcional)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={PESO_MAXIMO_KG}
                  step="0.1"
                  value={pesoSaida}
                  onChange={(e) => setPesoSaida(e.target.value)}
                />
                {/* Vira uma pesagem na data da saída — é o que fecha o GMD do
                    animal com o peso real da venda. */}
                <p style={{ fontSize: 13, color: 'var(--texto-suave)', marginTop: 4 }}>
                  Entra como a última pesagem e fecha o cálculo do GMD.
                </p>
              </div>
              <div className="campo">
                <label>Observação (opcional)</label>
                <input className="input" value={motivoSaida} onChange={(e) => setMotivoSaida(e.target.value)} />
              </div>
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
