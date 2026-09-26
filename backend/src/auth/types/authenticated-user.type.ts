export type AuthenticatedUser = {
  id: string;
  email: string;
  tipo: string;
  empresaId: string | null;
  versaoAutorizacao?: number;
  trocaSenhaObrigatoria?: boolean;
  perfis?: string[];
  permissoes?: string[];
};
