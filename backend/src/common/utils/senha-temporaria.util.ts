import { randomInt } from 'node:crypto';

export const COMPRIMENTO_SENHA_TEMPORARIA = 16;

// Alfabetos sem caracteres ambíguos (0/O, 1/l/I) para facilitar a entrega
// manual da credencial pelo SUPER_ADMIN em canal externo.
const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';
const MAIUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITOS = '23456789';
const SIMBOLOS = '!@#$%&*+-=?';
const TODOS = `${MINUSCULAS}${MAIUSCULAS}${DIGITOS}${SIMBOLOS}`;

function escolher(alfabeto: string): string {
  return alfabeto[randomInt(alfabeto.length)];
}

/**
 * Gera uma senha temporária com gerador criptograficamente seguro.
 * Garante o comprimento mínimo e ao menos um caractere de cada classe
 * exigida pela política vigente (minúscula, maiúscula, dígito e símbolo).
 */
export function gerarSenhaTemporaria(): string {
  const caracteres = [
    escolher(MINUSCULAS),
    escolher(MAIUSCULAS),
    escolher(DIGITOS),
    escolher(SIMBOLOS),
  ];

  while (caracteres.length < COMPRIMENTO_SENHA_TEMPORARIA) {
    caracteres.push(escolher(TODOS));
  }

  for (let indice = caracteres.length - 1; indice > 0; indice--) {
    const troca = randomInt(indice + 1);
    const temporario = caracteres[indice];
    caracteres[indice] = caracteres[troca];
    caracteres[troca] = temporario;
  }

  return caracteres.join('');
}
