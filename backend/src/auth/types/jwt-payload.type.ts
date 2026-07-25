export type JwtPayload = {
  sub: string;
  email: string;
  tipo: string;
  empresaId: string | null;
  iat?: number;
  exp?: number;
};
