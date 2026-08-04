import type { Metadata } from 'next';
import Link from 'next/link';
import { AoAparecer } from '@/components/AoAparecer';
import { GaleriaFuncionando } from '@/components/GaleriaFuncionando';

export const metadata: Metadata = {
  title: 'Pecus — Gestão completa para sua fazenda de gado',
  description:
    'Controle lotes, áreas, animais, sanidade, reprodução, estoque, gastos e financeiro da sua fazenda em um só lugar.',
};

const RECURSOS = [
  {
    titulo: 'Lotes',
    descricao: 'Cadastro de lotes de gado, ganho de peso e método de manejo.',
  },
  {
    titulo: 'Áreas e piquetes',
    descricao:
      'Cadastro de áreas de pasto, com subdivisão em piquetes, controle de altura do capim e rotação do gado.',
  },
  {
    titulo: 'Pesagens e GMD',
    descricao: 'Acompanhamento de peso e ganho médio diário por lote, ao longo do tempo.',
  },
  {
    titulo: 'Animais',
    descricao: 'Cadastro individual de animais dentro dos lotes.',
  },
  {
    titulo: 'Sanidade',
    descricao: 'Vacinas, medicamentos e alertas de vencimento.',
  },
  {
    titulo: 'Reprodução',
    descricao: 'Estação de monta, diagnóstico de gestação, partos.',
  },
  {
    titulo: 'Estoque',
    descricao: 'Controle de saldo de insumos (ração, suplemento etc.).',
  },
  {
    titulo: 'Gastos',
    descricao: 'Lançamento de gastos por categoria e por lote.',
  },
  {
    titulo: 'Financeiro',
    descricao: 'Plano de contas, contas a pagar/receber, bancos e contatos.',
  },
  {
    titulo: 'Relatórios',
    descricao: 'Dashboard, custo por arroba e indicadores por método de manejo.',
  },
];

const CAPTURAS = [
  { arquivo: 'dashboard', legenda: 'Visão geral: lotes, animais, gastos e alertas de sanidade num só painel.' },
  { arquivo: 'lote-detalhe', legenda: 'Evolução de peso e GMD de cada lote, calculado automaticamente.' },
  { arquivo: 'area-detalhe', legenda: 'Piquetes com altura do capim e rotação de gado por área.' },
  { arquivo: 'sanidade', legenda: 'Vencimentos de vacina e histórico sanitário por animal.' },
  { arquivo: 'financeiro', legenda: 'Contas a pagar e receber, com parcelamento automático.' },
  { arquivo: 'relatorios', legenda: 'Custo por arroba calculado direto dos seus lançamentos.' },
];

const PASSOS = [
  {
    titulo: 'Cadastre sua fazenda',
    descricao: 'Crie sua conta em poucos minutos e convide sua equipe depois, com permissões por usuário.',
  },
  {
    titulo: 'Organize lotes, áreas e animais',
    descricao: 'Registre seus lotes de gado, áreas de pasto e o método de manejo de cada um.',
  },
  {
    titulo: 'Acompanhe custos e resultados',
    descricao: 'Veja gastos, ganho de peso e indicadores em tempo real, sem depender de planilha.',
  },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="container landing-header-conteudo">
          <img src="/logo.png" alt="Pecus" className="landing-logo" />
          <nav className="landing-nav-links">
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#contato">Contato</a>
          </nav>
          <Link href="/login" className="btn">
            Entrar
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <img src="/background.png" alt="" className="landing-hero-bg" />
        <div className="landing-hero-overlay" />
        <div className="landing-hero-conteudo">
          <span className="landing-eyebrow landing-eyebrow--claro">Sistema de gestão rural</span>
          <h1>Gestão completa da sua fazenda, do lote ao relatório</h1>
          <p className="landing-hero-subtitulo">
            O Pecus junta lotes, áreas, animais, sanidade, reprodução, estoque, gastos e financeiro num só
            lugar — pra você controlar o ganho de peso e o resultado da fazenda sem depender de planilha.
          </p>
          <div className="landing-hero-ctas">
            <a href="#contato" className="btn">
              Fale com a gente
            </a>
            <Link href="/login" className="btn-secundario btn-secundario--claro">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <section id="recursos" className="landing-secao container">
        <AoAparecer className="landing-secao-titulo">
          <span className="landing-eyebrow">Recursos</span>
          <h2>Tudo que a fazenda precisa, num só sistema</h2>
          <p>Cada módulo pode ser ativado ou desativado conforme o que a sua fazenda realmente usa.</p>
        </AoAparecer>
        <div className="grid-cards">
          {RECURSOS.map((r, i) => (
            <AoAparecer key={r.titulo} atraso={i * 60}>
              <div className="card landing-recurso-card">
                <h3>{r.titulo}</h3>
                <p>{r.descricao}</p>
              </div>
            </AoAparecer>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="landing-secao container">
        <AoAparecer className="landing-secao-titulo">
          <span className="landing-eyebrow">Passo a passo</span>
          <h2>Como funciona</h2>
          <p>Três passos pra sair da planilha e ter controle de verdade.</p>
        </AoAparecer>
        <div className="landing-passos">
          {PASSOS.map((p, i) => (
            <AoAparecer key={p.titulo} atraso={i * 100}>
              <div className="card landing-passo">
                <div className="landing-passo-numero">{i + 1}</div>
                <h3>{p.titulo}</h3>
                <p>{p.descricao}</p>
              </div>
            </AoAparecer>
          ))}
        </div>
      </section>

      <section className="landing-secao container">
        <AoAparecer className="landing-secao-titulo">
          <span className="landing-eyebrow">Veja funcionando</span>
          <h2>O Pecus na prática</h2>
          <p>Direto do sistema real — assim é a tela que você vai usar todo dia. Clique numa imagem pra ampliar.</p>
        </AoAparecer>
        <GaleriaFuncionando capturas={CAPTURAS} />
      </section>

      <section id="contato" className="landing-cta-banner">
        <AoAparecer>
          <h2>Pronto pra organizar a gestão da sua fazenda?</h2>
          <p>Dúvidas, sugestões ou quer conhecer melhor o Pecus? É só chamar.</p>
        </AoAparecer>
        <div className="landing-contato-grade">
          <AoAparecer atraso={100}>
            <div className="card landing-contato-card">
              <h3>WhatsApp</h3>
              <a
                href="https://wa.me/5554996506468"
                className="btn-secundario"
                target="_blank"
                rel="noopener noreferrer"
              >
                Chamar no WhatsApp
              </a>
            </div>
          </AoAparecer>
          <AoAparecer atraso={200}>
            <div className="card landing-contato-card">
              <h3>E-mail</h3>
              <a href="mailto:borgesh989@gmail.com" className="btn-secundario">
                Enviar e-mail
              </a>
            </div>
          </AoAparecer>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container landing-footer-conteudo">
          <span>© {new Date().getFullYear()} Pecus. Todos os direitos reservados.</span>
          <Link href="/login">Ir para o portal</Link>
        </div>
      </footer>
    </div>
  );
}
