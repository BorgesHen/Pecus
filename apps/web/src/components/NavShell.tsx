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
}

const ITENS: ItemNav[] = [
  { href: '/dashboard', label: 'Visão geral' },
  { href: '/lotes', label: 'Lotes', modulo: ModuloSistema.LOTES },
  { href: '/areas', label: 'Áreas', modulo: ModuloSistema.AREAS },
  { href: '/animais', label: 'Animais', modulo: ModuloSistema.ANIMAIS },
  { href: '/sanidade', label: 'Sanidade', modulo: ModuloSistema.SANIDADE },
  { href: '/reproducao', label: 'Reprodução', modulo: ModuloSistema.REPRODUCAO },
  { href: '/insumos', label: 'Estoque', modulo: ModuloSistema.ESTOQUE },
  { href: '/gastos', label: 'Gastos', modulo: ModuloSistema.GASTOS },
  { href: '/financeiro', label: 'Financeiro', modulo: ModuloSistema.FINANCEIRO },
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

  const itensVisiveis = ITENS.filter(
    (item) =>
      (!item.papeis || item.papeis.includes(usuario.papelGlobal)) &&
      (!item.modulo || podeAcessar(item.modulo)) &&
      moduloAtivoNaFazenda(item.modulo),
  );

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
          {itensVisiveis.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shell-nav-link ${pathname === item.href ? 'shell-nav-link--ativo' : ''}`}
              onClick={() => setMenuAberto(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button className="shell-sair" onClick={sair}>
          Sair
        </button>
      </aside>

      <main className="shell-conteudo">{children}</main>
    </div>
  );
}
