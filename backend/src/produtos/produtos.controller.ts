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

import { ProdutosService } from './produtos.service';
import { CriarProdutoDto } from './dto/criar-produto.dto';
import { AtualizarProdutoDto } from './dto/atualizar-produto.dto';
import { FiltroProdutosDto } from './dto/filtro-produtos.dto';
import { CriarProdutoHistoricoDto } from './dto/criar-produto-historico.dto';

import { Auditar } from '../common/decorators/auditar.decorator';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';

@Controller('produtos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.CRIAR,
    entidade: AuditoriaEntidade.PRODUTO,
  })
  criar(
    @Body() body: CriarProdutoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.produtosService.criar(body, usuario);
  }

  @Get()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() filtros: FiltroProdutosDto,
  ) {
    return this.produtosService.listar(usuario, filtros);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarProdutoHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.produtosService.adicionarHistorico(id, body, usuario);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.produtosService.listarHistorico(id, usuario);
  }

  @Get(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.produtosService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.ATUALIZAR,
    entidade: AuditoriaEntidade.PRODUTO,
  })
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarProdutoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.produtosService.atualizar(id, body, usuario);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.ATIVAR,
    entidade: AuditoriaEntidade.PRODUTO,
  })
  ativar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.produtosService.ativar(id, usuario);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.DESATIVAR,
    entidade: AuditoriaEntidade.PRODUTO,
  })
  desativar(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.produtosService.desativar(id, usuario);
  }
}
