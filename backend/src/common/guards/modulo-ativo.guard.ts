import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { MODULO_ATIVO_KEY } from '../decorators/modulo-ativo.decorator';
import type { EmpresaContextoRequest } from '../types/empresa-contexto-request.type';

@Injectable()
export class ModuloAtivoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const chave = this.reflector.getAllAndOverride<string>(MODULO_ATIVO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!chave) return true;

    const request = context.switchToHttp().getRequest<EmpresaContextoRequest>();
    const empresaId = request.empresaContexto?.empresaId;
    if (!empresaId) {
      throw new ForbiddenException('Contexto empresarial não foi resolvido.');
    }

    const modulo = await this.prisma.moduloSistema.findUnique({
      where: { chave },
      select: { id: true, ativo: true },
    });
    if (!modulo?.ativo) throw new ForbiddenException('Módulo indisponível.');

    const vinculo = await this.prisma.empresaModulo.findUnique({
      where: { empresaId_moduloId: { empresaId, moduloId: modulo.id } },
      select: { ativo: true },
    });
    if (!vinculo?.ativo) {
      throw new ForbiddenException('Módulo não está ativo para esta empresa.');
    }
    return true;
  }
}
