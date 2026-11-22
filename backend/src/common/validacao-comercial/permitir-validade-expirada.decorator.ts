import { SetMetadata } from '@nestjs/common';

export const PERMITIR_VALIDADE_EXPIRADA_KEY =
  'validacao-comercial:permitir-validade-expirada';

/**
 * Marca rotas que permanecem acessíveis mesmo com a validade comercial
 * expirada. Uso restrito ao contexto mínimo de identidade previsto no
 * contrato da V3.6.1: consulta da própria sessão e troca de senha.
 */
export const PermitirValidadeExpirada = () =>
  SetMetadata(PERMITIR_VALIDADE_EXPIRADA_KEY, true);
