import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { EmpresaContextoRequest } from '../types/empresa-contexto-request.type';

export const EmpresaAtual = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<EmpresaContextoRequest>();

    if (!request.empresaContexto) {
      throw new InternalServerErrorException(
        'Contexto empresarial não foi resolvido.',
      );
    }

    return request.empresaContexto;
  },
);
