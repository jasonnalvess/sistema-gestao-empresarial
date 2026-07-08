import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CategoriasProdutosService } from './categorias-produtos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CriarCategoriaProdutoDto } from './dto/criar-categoria-produto.dto';
import { AtualizarCategoriaProdutoDto } from './dto/atualizar-categoria-produto.dto';
import { Auditar } from '../common/decorators/auditar.decorator';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';
import { FiltroCategoriasProdutosDto } from './dto/filtro-categorias-produtos.dto';

@Controller('categorias-produtos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriasProdutosController {
  constructor(private readonly categoriasProdutosService: CategoriasProdutosService) {}

  @Post()
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.CRIAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  criar(@Body() body: CriarCategoriaProdutoDto, @Req() req: any) {
    return this.categoriasProdutosService.criar(body, req.user);
  }

  @Get()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@Req() req: any, @Query() filtros: FiltroCategoriasProdutosDto) {
    return this.categoriasProdutosService.listar(req.user, filtros);
  }

  @Get(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(@Param('id') id: string, @Req() req: any) {
    return this.categoriasProdutosService.buscarPorId(id, req.user);
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
    @Req() req: any,
  ) {
    return this.categoriasProdutosService.atualizar(id, body, req.user);
  }

  @Patch(':id/ativar')
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.ATIVAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  ativar(@Param('id') id: string, @Req() req: any) {
    return this.categoriasProdutosService.ativar(id, req.user);
  }

  @Patch(':id/desativar')
  @Roles('ADMIN_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.DESATIVAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  desativar(@Param('id') id: string, @Req() req: any) {
    return this.categoriasProdutosService.desativar(id, req.user);
  }
}
