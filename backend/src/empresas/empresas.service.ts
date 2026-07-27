import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { obterEmpresaId } from '../common/utils/obter-empresa-id';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  criar(dados: { nome: string; cnpj?: string }) {
    return this.prisma.empresa.create({
      data: {
        nome: dados.nome,
        cnpj: dados.cnpj,
      },
    });
  }

  listar(usuarioLogado: AuthenticatedUser) {
    if (usuarioLogado.tipo === 'SUPER_ADMIN') {
      return this.prisma.empresa.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.empresa.findMany({
      where: {
        id: obterEmpresaId(usuarioLogado),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async buscarPorId(id: string, usuarioLogado: AuthenticatedUser) {
    const empresa = await this.buscarEmpresaOuFalhar(id);

    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      empresa.id !== obterEmpresaId(usuarioLogado)
    ) {
      throw new ForbiddenException('Acesso negado a empresa de outro usuário');
    }

    return empresa;
  }

  async atualizar(id: string, dados: { nome?: string; cnpj?: string }) {
    await this.buscarEmpresaOuFalhar(id);

    return this.prisma.empresa.update({
      where: { id },
      data: dados,
    });
  }

  async ativar(id: string) {
    await this.buscarEmpresaOuFalhar(id);

    return this.prisma.empresa.update({
      where: { id },
      data: { ativa: true },
    });
  }

  async desativar(id: string) {
    await this.buscarEmpresaOuFalhar(id);

    return this.prisma.empresa.update({
      where: { id },
      data: { ativa: false },
    });
  }

  async excluir(id: string) {
    await this.buscarEmpresaOuFalhar(id);

    return this.prisma.empresa.delete({
      where: { id },
    });
  }

  private async buscarEmpresaOuFalhar(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return empresa;
  }
}
