import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request.type';
import { PrismaService } from '../../prisma/prisma.service';
import { EMPRESA_ID_HEADER } from '../constants/empresa-contexto.constants';
import type { EmpresaContextoRequest } from '../types/empresa-contexto-request.type';

@Injectable()
export class EmpresaContextoGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const usuario = request.user;
    const cabecalho = this.obterCabecalho(request.headers[EMPRESA_ID_HEADER]);

    let empresaId: string;
    let origem: 'JWT' | 'SUPER_ADMIN_HEADER';

    if (usuario.tipo === 'SUPER_ADMIN') {
      if (!cabecalho) {
        throw new BadRequestException(
          'Selecione uma empresa para realizar esta operação.',
        );
      }
      if (!isUUID(cabecalho)) {
        throw new BadRequestException('Empresa selecionada inválida.');
      }
      empresaId = cabecalho;
      origem = 'SUPER_ADMIN_HEADER';
    } else {
      if (!usuario.empresaId) {
        throw new ForbiddenException(
          'Usuário não está vinculado a nenhuma empresa.',
        );
      }
      if (cabecalho && cabecalho !== usuario.empresaId) {
        throw new ForbiddenException(
          'Não é permitido acessar dados de outra empresa.',
        );
      }
      empresaId = usuario.empresaId;
      origem = 'JWT';
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true, ativa: true },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada.');
    if (!empresa.ativa) {
      throw new ForbiddenException(
        'Empresa inativa não pode utilizar este módulo.',
      );
    }

    (request as EmpresaContextoRequest).empresaContexto = {
      empresaId: empresa.id,
      origem,
    };
    return true;
  }

  private obterCabecalho(valor: string | string[] | undefined): string | null {
    if (Array.isArray(valor)) {
      throw new BadRequestException('Cabeçalho de empresa inválido.');
    }
    const normalizado = valor?.trim();
    return normalizado || null;
  }
}
