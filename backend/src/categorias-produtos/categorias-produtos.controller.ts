import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { CategoriasProdutosService } from './categorias-produtos.service';
import { CriarCategoriaProdutoDto } from './dto/criar-categoria-produto.dto';
import { AtualizarCategoriaProdutoDto } from './dto/atualizar-categoria-produto.dto';
import { FiltroCategoriasProdutosDto } from './dto/filtro-categorias-produtos.dto';

import { Auditar } from '../common/decorators/auditar.decorator';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';

@Controller('categorias-produtos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriasProdutosController {
  constructor(
    private readonly categoriasProdutosService: CategoriasProdutosService,
  ) {}

  @Post()
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.CRIAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  criar(
    @Body() body: CriarCategoriaProdutoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.categoriasProdutosService.criar(body, usuario);
  }

  @Get()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() filtros: FiltroCategoriasProdutosDto,
  ) {
    return this.categoriasProdutosService.listar(usuario, filtros);
  }

  @Get(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.categoriasProdutosService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.ATUALIZAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarCategoriaProdutoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.categoriasProdutosService.atualizar(id, body, usuario);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.ATIVAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  ativar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.categoriasProdutosService.ativar(id, usuario);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.DESATIVAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  desativar(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.categoriasProdutosService.desativar(id, usuario);
  }
}
