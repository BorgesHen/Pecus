import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EntidadeAtividade, PapelUsuario, type UsuarioAutenticado } from '@pecus/shared';
import { prisma } from '../prisma';
import { auditar } from '../atividades/atividades.service';
import { assinarToken } from '../auth';
import { criarPlanoContasPadrao } from '../financeiro/plano-contas.service';
import * as convitesService from '../convites/convites.service';
import { checarBloqueioLogin, registrarTentativaLogin } from '../rate-limit';
import { aplicarSenhaProvisoria, definirSenhaDefinitiva, provisoriaVencida } from '../senhas';
import * as emailService from '../email/email.service';
import type { LoginDto, RegistrarDto } from './dto';

/**
 * Registro público: exige um código de convite válido e ainda não usado
 * (gerado pelo ADMIN depois de fechar o negócio com o cliente), e então cria
 * o usuário como RESPONSAVEL e já cria a fazenda dele, vinculando os dois.
 */
export async function registrar(dto: RegistrarDto) {
  const [usuariosConflitantes, empresaConflitante] = await Promise.all([
    prisma.usuario.findMany({
      where: { OR: [{ email: dto.email }, { usuario: dto.usuario }] },
    }),
    prisma.empresa.findFirst({
      where: { nome: { equals: dto.nomeEmpresa, mode: 'insensitive' } },
    }),
  ]);

  const conflitos: string[] = [];
  if (usuariosConflitantes.some((u) => u.email === dto.email)) {
    conflitos.push('E-mail já cadastrado. Use outro e-mail para continuar.');
  }
  if (usuariosConflitantes.some((u) => u.usuario === dto.usuario)) {
    conflitos.push('Usuário já em uso. Escolha outro nome de usuário.');
  }
  if (empresaConflitante) {
    conflitos.push('Nome da fazenda já cadastrado. Escolha um nome diferente.');
  }
  if (conflitos.length > 0) {
    throw new ConflictException(conflitos);
  }

  const senhaHash = await bcrypt.hash(dto.senha, 10);

  const resultado = await prisma.$transaction(async (tx) => {
    await convitesService.reivindicar(tx, dto.codigoConvite);

    const usuario = await tx.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        usuario: dto.usuario,
        senhaHash,
        papelGlobal: PapelUsuario.RESPONSAVEL,
      },
    });

    const empresa = await tx.empresa.create({
      data: { nome: dto.nomeEmpresa },
    });

    await tx.usuarioEmpresa.create({
      data: {
        usuarioId: usuario.id,
        empresaId: empresa.id,
        papel: PapelUsuario.RESPONSAVEL,
      },
    });

    await criarPlanoContasPadrao(tx, empresa.id);

    return { usuario, empresa };
  }, {
    // A transação faz várias escritas em sequência; o padrão do Prisma (5s)
    // não dá folga suficiente quando a latência até o banco é alta (produção
    // serverless), e estourar aqui derruba o cadastro inteiro com erro 500.
    timeout: 20_000,
    maxWait: 10_000,
  });

  // Primeira linha do histórico da fazenda. Fica aqui, e não na rota, porque
  // /auth/registrar é público: não existe usuário autenticado ainda, o autor é
  // justamente a conta que acabou de nascer.
  const { usuario, empresa } = resultado;
  await auditar({ id: usuario.id, nome: usuario.nome, email: usuario.email }, empresa.id).criacao(
    EntidadeAtividade.FAZENDA,
    empresa.id,
    `Fazenda "${empresa.nome}" cadastrada`,
  );

  return gerarToken(resultado.usuario, resultado.empresa.id);
}

export async function login(dto: LoginDto, ip: string) {
  await checarBloqueioLogin(dto.usuario, ip);

  const usuario = await prisma.usuario.findUnique({
    where: { usuario: dto.usuario },
    include: { empresas: true },
  });
  const senhaOk = usuario ? await bcrypt.compare(dto.senha, usuario.senhaHash) : false;
  await registrarTentativaLogin(dto.usuario, ip, senhaOk);

  if (!usuario || !senhaOk) {
    throw new UnauthorizedException('Credenciais inválidas.');
  }

  // Provisória vencida não entra — a saída é pedir outra na própria tela de login.
  if (provisoriaVencida(usuario)) {
    throw new UnauthorizedException(
      'Sua senha provisória expirou. Use "Esqueci minha senha" para receber outra.',
    );
  }

  // Seleciona a primeira empresa como ativa (o front pode trocar depois)
  const empresaAtivaId = usuario.empresas[0]?.empresaId;
  return gerarToken(usuario, empresaAtivaId);
}

/** Reemite o token com outra empresaAtivaId — só se o usuário tiver vínculo com ela (ou for ADMIN). */
export async function trocarEmpresa(usuarioId: string, empresaId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new UnauthorizedException('Sessão inválida.');

  if (usuario.papelGlobal === PapelUsuario.ADMIN) {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada.');
  } else {
    const vinculo = await prisma.usuarioEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId, empresaId } },
    });
    if (!vinculo) throw new ForbiddenException('Você não tem acesso a esta empresa.');
  }

  return gerarToken(usuario, empresaId);
}

/**
 * Define a senha definitiva de quem entrou com provisória. Não pede a senha
 * atual porque a sessão já foi autenticada com ela agora mesmo — pedir de novo
 * só atrapalharia quem está copiando de um e-mail.
 *
 * Devolve token novo: o antigo carrega `senhaProvisoria: true` e continuaria
 * barrado pelo `autorizar`.
 */
export async function definirSenha(usuarioId: string, novaSenha: string) {
  const usuario = await definirSenhaDefinitiva(usuarioId, novaSenha);
  const vinculos = await prisma.usuarioEmpresa.findMany({ where: { usuarioId } });
  return gerarToken(usuario, vinculos[0]?.empresaId);
}

/**
 * "Esqueci minha senha" na tela de login. Público, então:
 *
 * - passa pelo mesmo limitador do login, senão vira ferramenta de spam contra
 *   o e-mail de terceiros;
 * - **nunca** revela se o usuário existe, e **nunca** devolve a senha no corpo
 *   da resposta — só o e-mail do dono da conta recebe. Quem não tem acesso ao
 *   e-mail precisa pedir o reset ao responsável da fazenda.
 */
export async function esqueciSenha(usuarioLogin: string, ip: string) {
  await checarBloqueioLogin(usuarioLogin, ip);

  // ATENÇÃO: esta checagem vem ANTES de procurar o usuário. Na ordem inversa,
  // "usuário existe" respondia 400 (sem SMTP) e "não existe" respondia 200 —
  // a diferença entre as respostas revelava quais logins existem, que é
  // exatamente o que a resposta neutra abaixo tenta evitar.
  if (!emailService.emailConfigurado()) {
    throw new BadRequestException(
      'O envio de e-mail ainda não está configurado neste servidor. Peça ao responsável da fazenda para redefinir sua senha.',
    );
  }

  const usuario = await prisma.usuario.findUnique({ where: { usuario: usuarioLogin } });

  // Resposta idêntica exista ou não, pra não permitir descobrir logins válidos.
  const respostaNeutra = {
    ok: true,
    // A mensagem precisa dar um próximo passo: como a resposta é neutra de
    // propósito, quem pediu não descobre se o envio falhou. Sem essa segunda
    // frase, alguém com o SMTP quebrado ficaria esperando um e-mail que nunca
    // vem, sem saber o que fazer.
    mensagem:
      'Se esse usuário existir, enviamos uma senha provisória para o e-mail cadastrado. Confira sua caixa de entrada e o spam — se não chegar em alguns minutos, peça ao responsável da fazenda para redefinir sua senha.',
  };

  if (!usuario) {
    await registrarTentativaLogin(usuarioLogin, ip, false);
    return respostaNeutra;
  }

  const provisoria = await aplicarSenhaProvisoria(usuario.id, true);
  const { enviado } = await emailService.enviar({
    para: usuario.email,
    ...emailService.mensagemSenhaRedefinida(usuario.nome, usuario.usuario, provisoria),
  });

  // Falha de envio também responde neutro: um 400 aqui e um 200 no caso
  // "usuário não existe" voltariam a diferenciar as duas situações. O motivo
  // real fica no log do servidor (email.service já registra).
  await registrarTentativaLogin(usuarioLogin, ip, enviado);
  return respostaNeutra;
}

function gerarToken(
  usuario: { id: string; email: string; nome: string; papelGlobal: string; senhaProvisoria?: boolean },
  empresaAtivaId?: string,
) {
  const payload: UsuarioAutenticado = {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    papelGlobal: usuario.papelGlobal as PapelUsuario,
    empresaAtivaId,
    // Só vai no token quando é verdade, pra não inflar o payload de todo mundo.
    ...(usuario.senhaProvisoria ? { senhaProvisoria: true } : {}),
  };

  return {
    access_token: assinarToken(payload),
    usuario: payload,
  };
}
