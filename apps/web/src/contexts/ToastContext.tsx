'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type TipoToast = 'sucesso' | 'erro' | 'aviso' | 'info';

interface Toast {
  id: number;
  tipo: TipoToast;
  mensagem: string;
  /** Marcado antes de sair do DOM, só pra a animação de saída rodar. */
  saindo?: boolean;
}

/** Erro e aviso ficam mais tempo: precisam ser lidos, não só percebidos. */
const DURACAO_MS: Record<TipoToast, number> = {
  sucesso: 4000,
  info: 4500,
  aviso: 6000,
  erro: 6500,
};

const MAX_VISIVEIS = 4;
const MS_ANIMACAO_SAIDA = 180;

const ICONE = {
  sucesso: CheckCircle2,
  erro: XCircle,
  aviso: AlertTriangle,
  info: Info,
} as const;

interface ToastContextValor {
  mostrar: (tipo: TipoToast, mensagem: string) => void;
  sucesso: (mensagem: string) => void;
  erro: (mensagem: string) => void;
  aviso: (mensagem: string) => void;
  info: (mensagem: string) => void;
  /**
   * Atalho pro `catch`: mostra a mensagem que o backend mandou (que costuma ser
   * mais útil — "Já existe um insumo com esse nome") e cai no texto de reserva
   * quando o erro não tem mensagem, tipo uma queda de rede.
   */
  erroDe: (e: unknown, reserva: string) => void;
}

const ToastContext = createContext<ToastContextValor | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const guardarTimer = (chave: number, timer: ReturnType<typeof setTimeout>) => {
    const anterior = timers.current.get(chave);
    if (anterior) clearTimeout(anterior);
    timers.current.set(chave, timer);
  };

  const descartar = useCallback((id: number) => {
    const auto = timers.current.get(id);
    if (auto) {
      clearTimeout(auto);
      timers.current.delete(id);
    }
    setToasts((atuais) => atuais.map((t) => (t.id === id ? { ...t, saindo: true } : t)));
    // Chave negativa pra não colidir com o timer de auto-fechamento do mesmo toast.
    guardarTimer(
      -id,
      setTimeout(() => {
        setToasts((atuais) => atuais.filter((t) => t.id !== id));
        timers.current.delete(-id);
      }, MS_ANIMACAO_SAIDA),
    );
  }, []);

  const mostrar = useCallback(
    (tipo: TipoToast, mensagem: string) => {
      const texto = String(mensagem ?? '').trim();
      if (!texto) return;

      const id = proximoId.current++;
      let novo = false;

      setToasts((atuais) => {
        const vivos = atuais.filter((t) => !t.saindo);
        // Clique duplo ou o mesmo erro repetido não empilha dois toasts iguais.
        if (vivos.some((t) => t.mensagem === texto && t.tipo === tipo)) return atuais;
        novo = true;
        return [...vivos, { id, tipo, mensagem: texto }].slice(-MAX_VISIVEIS);
      });

      // Fora do updater de propósito: agendar timer lá dentro duplicaria o
      // agendamento no StrictMode, que chama o updater duas vezes.
      if (novo) guardarTimer(id, setTimeout(() => descartar(id), DURACAO_MS[tipo]));
    },
    [descartar],
  );

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  const valor = useMemo<ToastContextValor>(
    () => ({
      mostrar,
      sucesso: (m) => mostrar('sucesso', m),
      erro: (m) => mostrar('erro', m),
      aviso: (m) => mostrar('aviso', m),
      info: (m) => mostrar('info', m),
      erroDe: (e, reserva) => mostrar('erro', e instanceof Error && e.message ? e.message : reserva),
    }),
    [mostrar],
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}

      <div className="toasts">
        {toasts.map((t) => {
          const Icone = ICONE[t.tipo];
          return (
            <div
              key={t.id}
              className={`toast toast--${t.tipo} ${t.saindo ? 'toast--saindo' : ''}`}
              role={t.tipo === 'erro' ? 'alert' : 'status'}
            >
              <Icone size={18} className="toast-icone" aria-hidden />
              <p>{t.mensagem}</p>
              <button
                type="button"
                className="toast-fechar"
                onClick={() => descartar(t.id)}
                aria-label="Fechar aviso"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error('useToast precisa estar dentro de um ToastProvider.');
  return contexto;
}
