'use client';

import { ArrowLeftRight, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  AcaoAtividade,
  LABEL_ACAO_ATIVIDADE,
  LABEL_ENTIDADE_ATIVIDADE,
  rotuloCampoAtividade,
  type RegistroAtividade,
} from '@pecus/shared';
import { brDataHora } from '@/lib/data';

const ICONE_ACAO = {
  [AcaoAtividade.CRIACAO]: Plus,
  [AcaoAtividade.ATUALIZACAO]: Pencil,
  [AcaoAtividade.EXCLUSAO]: Trash2,
  [AcaoAtividade.MOVIMENTACAO]: ArrowLeftRight,
};

/** Etiqueta colorida da ação — é o que faz a lista ser varrida com o olho. */
export function SeloAcao({ acao }: { acao: AcaoAtividade }) {
  const Icone = ICONE_ACAO[acao];
  return (
    <span className={`selo atividade-selo atividade-selo--${acao.toLowerCase()}`}>
      <Icone size={12} />
      {LABEL_ACAO_ATIVIDADE[acao]}
    </span>
  );
}

/**
 * Detalhes que valem mostrar. `camposAlterados` responde "o que mudou nessa
 * edição?", que é a pergunta que uma linha "Lote X editado" deixa no ar. Os
 * outros detalhes do log são ids, úteis pra investigar mas ruído na tela.
 */
function camposAlterados(detalhes: RegistroAtividade['detalhes']): string | null {
  const campos = detalhes?.camposAlterados;
  if (!Array.isArray(campos) || campos.length === 0) return null;
  return campos.map((campo) => rotuloCampoAtividade(String(campo))).join(', ');
}

export function ListaAtividades({
  itens,
  /** Mostra de qual módulo veio a linha (desnecessário quando a lista já é de um só). */
  mostrarModulo = true,
  vazio = 'Nenhuma atividade registrada ainda.',
}: {
  itens: RegistroAtividade[];
  mostrarModulo?: boolean;
  vazio?: string;
}) {
  if (itens.length === 0) {
    return <p className="atividade-vazio">{vazio}</p>;
  }

  return (
    <ul className="atividade-lista">
      {itens.map((item) => {
        const campos = camposAlterados(item.detalhes);
        return (
          <li key={item.id} className="atividade-item">
            <div className="atividade-item-topo">
              <SeloAcao acao={item.acao} />
              {mostrarModulo && (
                <span className="atividade-modulo">{LABEL_ENTIDADE_ATIVIDADE[item.entidade]}</span>
              )}
              <span className="atividade-quando">{brDataHora(item.createdAt)}</span>
            </div>
            <p className="atividade-descricao">{item.descricao}</p>
            <p className="atividade-autor">
              por {item.autorNome}
              {campos && <span className="atividade-campos"> · campos: {campos}</span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
