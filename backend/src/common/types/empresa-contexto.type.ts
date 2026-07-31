export type EmpresaContextoOrigem = 'JWT' | 'SUPER_ADMIN_HEADER';

export type EmpresaContexto = {
  empresaId: string;
  origem: EmpresaContextoOrigem;
};
