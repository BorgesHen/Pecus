'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Baby,
  ChartColumn,
  ChevronDown,
  Contact,
  Landmark,
  Layers,
  LayoutDashboard,
  ListTree,
  LogOut,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PawPrint,
  Puzzle,
  Receipt,
  Settings,
  Stethoscope,
  Ticket,
  Users,
  Warehouse,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import {
  ModuloSistema,
  PapelUsuario,
  MODULOS_CONFIGURAVEIS,
  CAMPO_MODULO_ATIVO,
  type UsuarioAutenticado,
  type Empresa,
  type ConfiguracaoEmpresa,
} from '@pecus/shared';
import { logout, trocarEmpresa } from '@/lib/auth';
import { listarMinhasEmpresas } from '@/lib/empresas';
import { usePermissoes } from '@/contexts/PermissoesContext';

interface ItemNav {
  href: string;
  label: string;
  icone: LucideIcon;
  papeis?: PapelUsuario[];
  modulo?: ModuloSistema;
  filhos?: ItemNav[];
}

const ITENS: ItemNav[] = [
  { href: '/dashboard', label: 'Visão geral', icone: LayoutDashboard },
  { href: '/lotes', label: 'Lotes', icone: Layers, modulo: ModuloSistema.LOTES },
  { href: '/areas', label: 'Áreas', icone: Map, modulo: ModuloSistema.AREAS },
  {
    href: '/animais',
    label: 'Animais',
    icone: PawPrint,
    modulo: ModuloSistema.ANIMAIS,
    filhos: [
      { href: '/sanidade', label: 'Sanidade', icone: Stethoscope, modulo: ModuloSistema.SANIDADE },
      { href: '/reproducao', label: 'Reprodução', icone: Baby, modulo: ModuloSistema.REPRODUCAO },
    ],
  },
  { href: '/insumos', label: 'Estoque', icone: Warehouse, modulo: ModuloSistema.ESTOQUE },
  { href: '/gastos', label: 'Gastos', icone: Receipt, modulo: ModuloSistema.GASTOS },
  {
    href: '/financeiro',
    label: 'Financeiro',
    icone: Landmark,
    modulo: ModuloSistema.FINANCEIRO,
    filhos: [
      {
        href: '/financeiro/plano-contas',
        label: 'Plano de contas',
        icone: ListTree,
        modulo: ModuloSistema.FINANCEIRO,
      },
      {
        href: '/financeiro/contatos-bancos',
        label: 'Contatos e bancos',
        icone: Contact,
        modulo: ModuloSistema.FINANCEIRO,
      },
    ],
  },
  { href: '/relatorios', label: 'Relatórios', icone: ChartColumn, modulo: ModuloSistema.RELATORIOS },
  {
    href: '/metodos-manejo',
    label: 'Métodos de manejo',
    icone: Workflow,
    papeis: [PapelUsuario.ADMIN, PapelUsuario.RESPONSAVEL],
    modulo: ModuloSistema.METODOS_MANEJO,
  },
  {
    href: '/usuarios',
    label: 'Usuários',
    icone: Users,
    papeis: [PapelUsuario.ADMIN, PapelUsuario.RESPONSAVEL],
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icone: Settings,
    papeis: [PapelUsuario.ADMIN, PapelUsuario.RESPONSAVEL],
  },
  { href: '/convites', label: 'Convites', icone: Ticket, papeis: [PapelUsuario.ADMIN] },
  {
    href: '/recursos-personalizados',
    label: 'Recursos personalizados',
    icone: Puzzle,
    papeis: [PapelUsuario.ADMIN],
  },
];

const CHAVE_RECOLHIDA = 'pecus_sidebar_recolhida';

export function NavShell({
  usuario,
  children,
}: {
  usuario: UsuarioAutenticado;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [recolhida, setRecolhida] = useState(false);
  // No celular a barra já é uma gaveta que abre por cima do conteúdo, então
  // recolher não faz sentido — a preferência fica guardada e volta no desktop.
  const [ehMobile, setEhMobile] = useState(false);
  // Só depois de ler a preferência do localStorage as transições entram em cena,
  // senão a barra "anima" sozinha no primeiro paint de quem deixou ela recolhida.
  const [preferenciaLida, setPreferenciaLida] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [trocando, setTrocando] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  // Posição do submenu flutuante da barra recolhida (ver comentário no CSS:
  // ele é `fixed`, então o top/left tem que vir daqui).
  const [posSubmenu, setPosSubmenu] = useState<
    { href: string; top: number; left: number; paddingLeft: number } | null
  >(null);
  const pathname = usePathname();
  const router = useRouter();
  const { podeAcessar, configEmpresa } = usePermissoes();

  useEffect(() => {
    listarMinhasEmpresas().then(setEmpresas).catch(() => {});
  }, []);

  useEffect(() => {
    setRecolhida(localStorage.getItem(CHAVE_RECOLHIDA) === '1');
    setPreferenciaLida(true);
  }, []);

  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 720px)');
    const aplicar = () => setEhMobile(consulta.matches);
    aplicar();
    consulta.addEventListener('change', aplicar);
    return () => consulta.removeEventListener('change', aplicar);
  }, []);

  const barraRecolhida = recolhida && !ehMobile;

  function alternarRecolhida() {
    setRecolhida((atual) => {
      const novo = !atual;
      localStorage.setItem(CHAVE_RECOLHIDA, novo ? '1' : '0');
      return novo;
    });
  }

  function moduloAtivoNaFazenda(modulo?: ModuloSistema) {
    if (!modulo || !configEmpresa) return true;
    const campo = CAMPO_MODULO_ATIVO[modulo] as keyof ConfiguracaoEmpresa | undefined;
    if (!campo || !MODULOS_CONFIGURAVEIS.includes(modulo)) return true;
    return Boolean(configEmpresa[campo]);
  }

  function itemVisivel(item: ItemNav) {
    return (
      (!item.papeis || item.papeis.includes(usuario.papelGlobal)) &&
      (!item.modulo || podeAcessar(item.modulo)) &&
      moduloAtivoNaFazenda(item.modulo)
    );
  }

  const itensVisiveis = ITENS.filter(itemVisivel).map((item) => ({
    ...item,
    filhos: item.filhos?.filter(itemVisivel),
  }));

  function alternarExpandido(href: string) {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(href)) {
        novo.delete(href);
      } else {
        novo.add(href);
      }
      return novo;
    });
  }

  function posicionarSubmenu(href: string, elemento: HTMLElement) {
    if (!barraRecolhida) return;
    const r = elemento.getBoundingClientRect();
    const barra = elemento.closest('.shell-sidebar')?.getBoundingClientRect();
    // O painel começa na borda direita do item, mas o conteúdo dele só depois da
    // borda da barra: o padding cobre esse vão (que inclui o padding da barra e a
    // calha da barra de rolagem) e mantém o caminho do mouse contínuo — sem ele o
    // hover se perde no meio e o submenu fecha.
    const vao = Math.max(0, (barra?.right ?? r.right) - r.right) + 8;
    // Não deixa o painel passar da borda de baixo da janela.
    const top = Math.min(r.top, Math.max(8, window.innerHeight - 110));
    setPosSubmenu({ href, top, left: r.right, paddingLeft: vao });
  }

  function sair() {
    logout();
    router.replace('/login');
  }

  async function selecionarEmpresa(empresaId: string) {
    if (!empresaId || empresaId === usuario.empresaAtivaId) return;
    setTrocando(true);
    try {
      await trocarEmpresa(empresaId);
      window.location.href = '/dashboard';
    } catch {
      setTrocando(false);
    }
  }

  const classesSidebar = [
    'shell-sidebar',
    menuAberto ? 'shell-sidebar--aberta' : '',
    barraRecolhida ? 'shell-sidebar--recolhida' : '',
    preferenciaLida ? '' : 'shell-sidebar--sem-transicao',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="shell">
      <button className="shell-menu-btn" aria-label="Abrir menu" onClick={() => setMenuAberto(true)}>
        <Menu size={20} strokeWidth={2} />
      </button>

      {menuAberto && <div className="shell-overlay" onClick={() => setMenuAberto(false)} />}

      <aside className={classesSidebar}>
        <div className="shell-brand">
          {/* Recolhida a barra tem ~72px: só a marca (o "P") do logo cabe legível. */}
          <img
            src={barraRecolhida ? '/logo-360-marca.png' : '/logo-invertida.png'}
            alt="Pecus 360"
            className={barraRecolhida ? 'shell-brand-marca' : ''}
          />
          <button
            type="button"
            className="shell-recolher"
            aria-label={barraRecolhida ? 'Expandir menu' : 'Recolher menu'}
            title={barraRecolhida ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!barraRecolhida}
            onClick={alternarRecolhida}
          >
            {barraRecolhida ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {empresas.length > 1 && (
          <div className="shell-empresas">
            <select
              className="input"
              value={usuario.empresaAtivaId ?? ''}
              disabled={trocando}
              onChange={(e) => selecionarEmpresa(e.target.value)}
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="shell-nav">
          {itensVisiveis.map((item) => {
            const temFilhos = (item.filhos?.length ?? 0) > 0;
            const filhoAtivo = item.filhos?.some((filho) => filho.href === pathname) ?? false;
            const expandido = filhoAtivo || expandidos.has(item.href);
            const Icone = item.icone;

            return (
              <div key={item.href} className="shell-nav-grupo">
                <div
                  className="shell-nav-linha"
                  onMouseEnter={
                    temFilhos ? (e) => posicionarSubmenu(item.href, e.currentTarget) : undefined
                  }
                  onFocus={temFilhos ? (e) => posicionarSubmenu(item.href, e.currentTarget) : undefined}
                >
                  <Link
                    href={item.href}
                    className={`shell-nav-link ${pathname === item.href ? 'shell-nav-link--ativo' : ''}`}
                    title={item.label}
                    onClick={() => setMenuAberto(false)}
                  >
                    <Icone className="shell-nav-icone" size={18} strokeWidth={1.75} aria-hidden />
                    <span className="shell-nav-texto">{item.label}</span>
                  </Link>
                  {temFilhos && (
                    <button
                      type="button"
                      className={`shell-nav-seta ${expandido ? 'shell-nav-seta--aberta' : ''}`}
                      aria-label={expandido ? `Recolher ${item.label}` : `Expandir ${item.label}`}
                      aria-expanded={expandido}
                      onClick={() => alternarExpandido(item.href)}
                    >
                      <ChevronDown size={14} strokeWidth={2} aria-hidden />
                    </button>
                  )}
                </div>

                {/* Sempre no DOM pra poder animar a abertura e, com a barra
                    recolhida, aparecer como submenu flutuante no hover. */}
                {temFilhos && (
                  <div
                    className={`shell-nav-filhos ${expandido ? 'shell-nav-filhos--aberta' : ''}`}
                    style={
                      barraRecolhida && posSubmenu?.href === item.href
                        ? {
                            top: posSubmenu.top,
                            left: posSubmenu.left,
                            paddingLeft: posSubmenu.paddingLeft,
                          }
                        : undefined
                    }
                  >
                    <div className="shell-nav-filhos-interno">
                      {item.filhos!.map((filho) => {
                        const IconeFilho = filho.icone;
                        return (
                          <Link
                            key={filho.href}
                            href={filho.href}
                            className={`shell-nav-link shell-nav-link--filho ${
                              pathname === filho.href ? 'shell-nav-link--ativo' : ''
                            }`}
                            title={filho.label}
                            onClick={() => setMenuAberto(false)}
                          >
                            <IconeFilho className="shell-nav-icone" size={16} strokeWidth={1.75} aria-hidden />
                            <span className="shell-nav-texto">{filho.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <button className="shell-sair" onClick={sair} title="Sair">
          <LogOut size={17} strokeWidth={1.75} aria-hidden />
          <span className="shell-nav-texto">Sair</span>
        </button>
      </aside>

      <main className="shell-conteudo">{children}</main>
    </div>
  );
}
