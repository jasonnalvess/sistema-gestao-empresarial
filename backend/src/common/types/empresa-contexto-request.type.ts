import type { AuthenticatedRequest } from '../../auth/types/authenticated-request.type';
import type { EmpresaContexto } from './empresa-contexto.type';

export type EmpresaContextoRequest = AuthenticatedRequest & {
  empresaContexto: EmpresaContexto;
};
