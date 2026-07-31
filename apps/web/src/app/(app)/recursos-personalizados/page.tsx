'use client';

import { useEffect, useState } from 'react';
import { RECURSOS_PERSONALIZADOS, type Empresa } from '@pecus/shared';
import { listarMinhasEmpresas, atualizarRecursosPersonalizados } from '@/lib/empresas';
import { usePermissoes } from '@/contexts/PermissoesContext';

export default function RecursosPersonalizadosPage() {
  const { recarregarConfigEmpresa } = usePermissoes();
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [erro, setErro] = useState('');
  const [salvandoId, setSalvandoId] = useState('');
  const [salvoId, setSalvoId] = useState('');

  function carregar() {
    listarMinhasEmpresas()
      .then(setEmpresas)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar fazendas'));
  }

  useEffect(() => {
    carregar();
  }, []);

  function alternar(empresa: Empresa, chave: string) {
    if (!empresas) return;
    const ativo = empresa.recursosPersonalizados.includes(chave);
    const novosRecursos = ativo
      ? empresa.recursosPersonalizados.filter((c) => c !== chave)
      : [...empresa.recursosPersonalizados, chave];
    setEmpresas(empresas.map((e) => (e.id === empresa.id ? { ...e, recursosPersonalizados: novosRecursos } : e)));
  }

  async function salvar(empresa: Empresa) {
    setSalvandoId(empresa.id);
    setErro('');
    setSalvoId('');
    try {
      await atualizarRecursosPersonalizados(empresa.id, empresa.recursosPersonalizados);
      // Propaga pro resto do app (menu e campos das telas) sem exigir F5. Se a
      // fazenda editada não for a ativa, isso só reconfirma a configuração atual.
      await recarregarConfigEmpresa();
      setSalvoId(empresa.id);
      setTimeout(() => setSalvoId(''), 3000);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvandoId('');
    }
  }

  if (RECURSOS_PERSONALIZADOS.length === 0) {
    return (
      <div className="container">
        <h2 style={{ marginBottom: 20 }}>Recursos personalizados</h2>
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>
            Nenhum recurso sob encomenda cadastrado ainda. Quando um cliente pedir algo específico pra
            fazenda dele, a funcionalidade é construída e aparece aqui automaticamente, pra você liberar
            só pra fazenda que pediu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 style={{ marginBottom: 8 }}>Recursos personalizados</h2>
      <p style={{ color: 'var(--texto-suave)', marginBottom: 20, fontSize: 14 }}>
        Liga recursos sob encomenda só pra fazenda que pediu — nenhuma outra fazenda vê essas opções.
      </p>

      {erro && <div className="erro">{erro}</div>}
      {!empresas && !erro && <p>Carregando...</p>}

      {empresas && empresas.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>Nenhuma fazenda cadastrada ainda.</p>
        </div>
      )}

      {empresas &&
        empresas.map((empresa) => (
          <div key={empresa.id} className="card" style={{ marginBottom: 16 }}>
            <div className="topo-tela" style={{ marginBottom: 12 }}>
              <strong>{empresa.nome}</strong>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {salvoId === empresa.id && (
                  <span style={{ color: 'var(--verde)', fontSize: 14 }}>Salvo ✓</span>
                )}
                <button
                  className="btn-secundario"
                  onClick={() => salvar(empresa)}
                  disabled={salvandoId === empresa.id}
                >
                  {salvandoId === empresa.id ? 'Salvando...' : 'Salvar'}
                </button>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RECURSOS_PERSONALIZADOS.map((recurso) => (
                <label
                  key={recurso.chave}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={empresa.recursosPersonalizados.includes(recurso.chave)}
                    onChange={() => alternar(empresa, recurso.chave)}
                    style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }}
                  />
                  <span>
                    <strong>{recurso.label}</strong>
                    <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 2 }}>
                      {recurso.descricao}
                    </p>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
