'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  papeis?: PapelUsuario[];
  modulo?: ModuloSistema;
  filhos?: ItemNav[];
}

const ITENS: ItemNav[] = [
  { href: '/dashboard', label: 'Visão geral' },
  { href: '/lotes', label: 'Lotes', modulo: ModuloSistema.LOTES },
  { href: '/areas', label: 'Áreas', modulo: ModuloSistema.AREAS },
  {
    href: '/animais',
    label: 'Animais',
    modulo: ModuloSistema.ANIMAIS,
    filhos: [
      { href: '/sanidade', label: 'Sanidade', modulo: ModuloSistema.SANIDADE },
      { href: '/reproducao', label: 'Reprodução', modulo: ModuloSistema.REPRODUCAO },
    ],
  },
  { href: '/insumos', label: 'Estoque', modulo: ModuloSistema.ESTOQUE },
  { href: '/gastos', label: 'Gastos', modulo: ModuloSistema.GASTOS },
  {
    href: '/financeiro',
    label: 'Financeiro',
    modulo: ModuloSistema.FINANCEIRO,
    filhos: [
      { href: '/financeiro/plano-contas', label: 'Plano de contas', modulo: ModuloSistema.FINANCEIRO },
      { href: '/financeiro/contatos-bancos', label: 'Contatos e bancos', modulo: ModuloSistema.FINANCEIRO },
    ],
  },
  { href: '/relatorios', label: 'Relatórios', modulo: ModuloSistema.RELATORIOS },
  {
    href: '/metodos-manejo',
    label: 'Métodos de manejo',
    papeis: [PapelUsuario.ADMIN, PapelUsuario.RESPONSAVEL],
    modulo: ModuloSistema.METODOS_MANEJO,
  },
  { href: '/usuarios', label: 'Usuários', papeis: [PapelUsuario.ADMIN, PapelUsuario.RESPONSAVEL] },
  {
    href: '/configuracoes',
    label: 'Configurações',
    papeis: [PapelUsuario.ADMIN, PapelUsuario.RESPONSAVEL],
  },
  { href: '/convites', label: 'Convites', papeis: [PapelUsuario.ADMIN] },
  { href: '/recursos-personalizados', label: 'Recursos personalizados', papeis: [PapelUsuario.ADMIN] },
];

export function NavShell({
  usuario,
  children,
}: {
  usuario: UsuarioAutenticado;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [trocando, setTrocando] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const router = useRouter();
  const { podeAcessar, configEmpresa } = usePermissoes();

  useEffect(() => {
    listarMinhasEmpresas().then(setEmpresas).catch(() => {});
  }, []);

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

  return (
    <div className="shell">
      <button className="shell-menu-btn" aria-label="Abrir menu" onClick={() => setMenuAberto(true)}>
        ☰
      </button>

      {menuAberto && <div className="shell-overlay" onClick={() => setMenuAberto(false)} />}

      <aside className={`shell-sidebar ${menuAberto ? 'shell-sidebar--aberta' : ''}`}>
        <div className="shell-brand">
          <img src="/logo-invertida.png" alt="Pecus" />
        </div>

        {empresas.length > 1 && (
          <div style={{ padding: '0 16px 16px' }}>
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

            return (
              <div key={item.href} className="shell-nav-grupo">
                <div className="shell-nav-linha">
                  <Link
                    href={item.href}
                    className={`shell-nav-link ${pathname === item.href ? 'shell-nav-link--ativo' : ''}`}
                    onClick={() => setMenuAberto(false)}
                  >
                    {item.label}
                  </Link>
                  {temFilhos && (
                    <button
                      type="button"
                      className={`shell-nav-seta ${expandido ? 'shell-nav-seta--aberta' : ''}`}
                      aria-label={expandido ? `Recolher ${item.label}` : `Expandir ${item.label}`}
                      aria-expanded={expandido}
                      onClick={() => alternarExpandido(item.href)}
                    >
                      ▾
                    </button>
                  )}
                </div>

                {temFilhos && expandido && (
                  <div className="shell-nav-filhos">
                    {item.filhos!.map((filho) => (
                      <Link
                        key={filho.href}
                        href={filho.href}
                        className={`shell-nav-link shell-nav-link--filho ${
                          pathname === filho.href ? 'shell-nav-link--ativo' : ''
                        }`}
                        onClick={() => setMenuAberto(false)}
                      >
                        {filho.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <button className="shell-sair" onClick={sair}>
          Sair
        </button>
      </aside>

      <main className="shell-conteudo">{children}</main>
    </div>
  );
}
