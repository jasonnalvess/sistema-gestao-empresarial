import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarMarcaProdutoDto } from './dto/criar-marca-produto.dto';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { calcularPaginacao } from '../common/utils/paginacao';
import { respostaPaginada } from '../common/utils/resposta-paginada';

@Injectable()
export class MarcasProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarMarcaProdutoDto, usuarioLogado: any) {
    return this.prisma.marcaProduto.create({
      data: {
        nome: dados.nome,
        descricao: dados.descricao,
        empresaId: usuarioLogado.empresaId,
      },
    });
  }

  async listar(usuarioLogado: any, paginacao: PaginacaoDto) {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? 10;
    const { skip, take } = calcularPaginacao(page, limit);

    const where: any =
      usuarioLogado.tipo === 'SUPER_ADMIN'
        ? {}
        : { empresaId: usuarioLogado.empresaId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.marcaProduto.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.marcaProduto.count({ where }),
    ]);

    return respostaPaginada(data, total, page, limit);
  }

  async buscarPorId(id: string, usuarioLogado: any) {
    const marca = await this.prisma.marcaProduto.findUnique({
      where: { id },
    });

    if (!marca) {
      throw new NotFoundException('Marca não encontrada');
    }

    if (
      usuarioLogado.tipo !== 'SUPER_ADMIN' &&
      marca.empresaId !== usuarioLogado.empresaId
    ) {
      throw new ForbiddenException('Acesso negado a marca de outra empresa');
    }

    return marca;
  }

  async atualizar(
    id: string,
    dados: Partial<CriarMarcaProdutoDto>,
    usuarioLogado: any,
  ) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.marcaProduto.update({
      where: { id },
      data: {
        nome: dados.nome,
        descricao: dados.descricao,
      },
    });
  }

  async ativar(id: string, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.marcaProduto.update({
      where: { id },
      data: { ativo: true },
    });
  }

  async desativar(id: string, usuarioLogado: any) {
    await this.buscarPorId(id, usuarioLogado);

    return this.prisma.marcaProduto.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
