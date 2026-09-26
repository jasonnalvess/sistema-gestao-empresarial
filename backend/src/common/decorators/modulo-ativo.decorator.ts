import { SetMetadata } from '@nestjs/common';

export const MODULO_ATIVO_KEY = 'moduloAtivo';

export const ModuloAtivo = (chave: string) =>
  SetMetadata(MODULO_ATIVO_KEY, chave);
