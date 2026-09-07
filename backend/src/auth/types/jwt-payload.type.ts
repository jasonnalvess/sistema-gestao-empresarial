export type JwtPayload = {
  id: string;
  email: string;
  tipo: string;
  empresaId: string | null;
  versaoAutorizacao?: number;
  perfis?: string[];
  permissoes?: string[];
  iat?: number;
  exp?: number;
};
