import type { SituacaoComercial } from '../../common/validacao-comercial/situacao-comercial';

export type AuthenticatedUser = {
  id: string;
  email: string;
  tipo: string;
  empresaId: string | null;
  versaoAutorizacao?: number;
  trocaSenhaObrigatoria?: boolean;
  perfis?: string[];
  permissoes?: string[];
  /** Situação comercial derivada da empresa na requisição atual. */
  situacaoComercial?: SituacaoComercial;
  /** Código de bloqueio comercial quando a empresa está bloqueada. */
  codigoBloqueio?: string | null;
};
