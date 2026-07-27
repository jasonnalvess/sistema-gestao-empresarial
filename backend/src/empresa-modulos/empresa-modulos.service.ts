import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmpresaModulosService {
  constructor(private readonly prisma: PrismaService) {}

  async vincular(empresaId: string, moduloId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    const modulo = await this.prisma.moduloSistema.findUnique({
      where: { id: moduloId },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!modulo) {
      throw new NotFoundException('Módulo não encontrado');
    }

    return this.prisma.empresaModulo.upsert({
      where: {
        empresaId_moduloId: {
          empresaId,
          moduloId,
        },
      },
      update: {
        ativo: true,
      },
      create: {
        empresaId,
        moduloId,
        ativo: true,
      },
      include: {
        empresa: true,
        modulo: true,
      },
    });
  }

  async listarPorEmpresa(empresaId: string, usuarioLogado: AuthenticatedUser) {
    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      usuarioLogado.empresaId !== empresaId
    ) {
      throw new ForbiddenException('Acesso negado aos módulos desta empresa');
    }

    return this.prisma.empresaModulo.findMany({
      where: { empresaId },
      include: {
        modulo: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async ativar(id: string) {
    await this.buscarPorId(id);

    return this.prisma.empresaModulo.update({
      where: { id },
      data: { ativo: true },
      include: {
        empresa: true,
        modulo: true,
      },
    });
  }

  async desativar(id: string) {
    await this.buscarPorId(id);

    return this.prisma.empresaModulo.update({
      where: { id },
      data: { ativo: false },
      include: {
        empresa: true,
        modulo: true,
      },
    });
  }

  async buscarPorId(id: string) {
    const registro = await this.prisma.empresaModulo.findUnique({
      where: { id },
    });

    if (!registro) {
      throw new NotFoundException('Vínculo empresa/módulo não encontrado');
    }

    return registro;
  }
}
