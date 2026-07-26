export type JwtPayload = {
  id: string;
  email: string;
  tipo: string;
  empresaId: string | null;
  iat?: number;
  exp?: number;
};
