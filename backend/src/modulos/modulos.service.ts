import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModulosService {
  constructor(private readonly prisma: PrismaService) {}

  criar(dados: { nome: string; chave: string; descricao?: string }) {
    return this.prisma.moduloSistema.create({
      data: dados,
    });
  }

  listar() {
    return this.prisma.moduloSistema.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async buscarPorId(id: string) {
    const modulo = await this.prisma.moduloSistema.findUnique({
      where: { id },
    });

    if (!modulo) {
      throw new NotFoundException('Módulo não encontrado');
    }

    return modulo;
  }

  async ativar(id: string) {
    await this.buscarPorId(id);

    return this.prisma.moduloSistema.update({
      where: { id },
      data: { ativo: true },
    });
  }

  async desativar(id: string) {
    await this.buscarPorId(id);

    return this.prisma.moduloSistema.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
