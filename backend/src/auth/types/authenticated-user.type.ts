export type AuthenticatedUser = {
  id: string;
  email: string;
  tipo: string;
  empresaId: string | null;
  perfis?: string[];
  permissoes?: string[];
};
