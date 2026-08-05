import { rotuloCampoAtividade } from '../enums/atividade';

/**
 * Traduz as mensagens de validação do `class-validator` para português.
 *
 * O motivo: as mensagens chegavam cruas na tela. Digitar hectares negativos numa
 * área mostrava **"areaHectares must not be less than 0"** — em inglês, com o
 * nome da coluna do banco. É a mensagem certa para um log e a errada para um
 * produtor, e o problema não era daquela tela: era de todos os DTOs do sistema,
 * porque nenhum passava `message` nos decoradores.
 *
 * Consertar aqui, na saída da validação, resolve todas as telas de uma vez — em
 * vez de escrever uma mensagem à mão em cada uma das centenas de regras. E
 * reaproveita `rotuloCampoAtividade`, que já sabe traduzir nome de coluna para
 * rótulo em português (era usado na trilha de atividades).
 *
 * Quando aparecer uma regra que não está aqui, a mensagem original em inglês é
 * devolvida: pior que traduzida, melhor que engolida.
 */

/** Uma restrição violada: a chave do `class-validator` e a mensagem que ele gerou. */
export interface RestricaoViolada {
  chave: string;
  mensagemOriginal: string;
}

/** Extrai o número que a mensagem do class-validator embute (o limite de `@Min`, `@Max`…). */
function limite(mensagem: string): string | null {
  const achado = mensagem.match(/-?\d+(?:[.,]\d+)?/);
  return achado ? achado[0].replace('.', ',') : null;
}

/** Extrai a lista de valores aceitos que o `@IsEnum` embute na mensagem. */
function valoresAceitos(mensagem: string): string | null {
  const achado = mensagem.match(/following values:\s*(.+)$/);
  return achado ? achado[1] : null;
}

/**
 * O texto que completa a frase, depois do nome do campo.
 *
 * As frases são pensadas para ler bem em sequência: "Tamanho (ha) não pode ser
 * menor que 0." Sujeito primeiro, como o produtor lê.
 */
function frase(chave: string, mensagemOriginal: string): string | null {
  switch (chave) {
    case 'isDefined':
    case 'isNotEmpty':
      return 'é obrigatório';
    case 'isString':
      return 'deve ser um texto';
    case 'isNumber':
    case 'isNumberString':
      return 'deve ser um número';
    case 'isInt':
      return 'deve ser um número inteiro';
    case 'isBoolean':
      return 'deve ser um valor de sim ou não';
    case 'isEmail':
      return 'deve ser um e-mail válido';
    case 'isDateString':
      return 'deve ser uma data válida';
    case 'isDate':
      return 'deve ser uma data';
    case 'isArray':
      return 'deve ser uma lista';
    case 'arrayNotEmpty':
      return 'precisa ter ao menos um item';
    case 'isUUID':
      return 'tem um identificador inválido';
    case 'isPositive':
      return 'deve ser maior que zero';
    case 'isNegative':
      return 'deve ser menor que zero';
    case 'min': {
      const valor = limite(mensagemOriginal);
      // "não pode ser menor que 0" soa esquisito; o que se quer dizer é que
      // número negativo não serve.
      if (valor === '0') return 'não pode ser negativo';
      return valor ? `não pode ser menor que ${valor}` : 'está abaixo do mínimo';
    }
    case 'max': {
      const valor = limite(mensagemOriginal);
      return valor ? `não pode ser maior que ${valor}` : 'está acima do máximo';
    }
    case 'minLength': {
      const valor = limite(mensagemOriginal);
      return valor ? `precisa ter ao menos ${valor} caracteres` : 'está curto demais';
    }
    case 'maxLength': {
      const valor = limite(mensagemOriginal);
      return valor ? `não pode passar de ${valor} caracteres` : 'está longo demais';
    }
    case 'isEnum': {
      const valores = valoresAceitos(mensagemOriginal);
      return valores ? `deve ser um destes: ${valores}` : 'tem um valor inválido';
    }
    case 'matches':
      return 'está em formato inválido';
    case 'whitelistValidation':
      // Campo que o DTO não aceita. Não é erro de quem digita — é o front
      // mandando algo a mais —, então a frase evita culpar o usuário.
      // "não é um campo válido" e não "não é aceito": o gênero do nome do campo
      // é desconhecido, e concordar com "campo" funciona pra qualquer um deles.
      return 'não é um campo válido neste cadastro';
    default:
      return null;
  }
}

/**
 * Mensagem em português para uma restrição violada num campo.
 *
 * `Tamanho (ha) não pode ser negativo.` em vez de
 * `areaHectares must not be less than 0`.
 */
export function traduzirRestricao(propriedade: string, restricao: RestricaoViolada): string {
  const complemento = frase(restricao.chave, restricao.mensagemOriginal);
  if (!complemento) return restricao.mensagemOriginal;
  return `${rotuloCampoAtividade(propriedade)} ${complemento}.`;
}
