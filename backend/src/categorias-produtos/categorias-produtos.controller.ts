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
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Auditar } from '../common/decorators/auditar.decorator';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import { CategoriasProdutosService } from './categorias-produtos.service';
import { AtualizarCategoriaProdutoDto } from './dto/atualizar-categoria-produto.dto';
import { CriarCategoriaProdutoDto } from './dto/criar-categoria-produto.dto';
import { FiltroCategoriasProdutosDto } from './dto/filtro-categorias-produtos.dto';

@Controller('categorias-produtos')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class CategoriasProdutosController {
  constructor(
    private readonly categoriasProdutosService: CategoriasProdutosService,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.categorias.criar')
  @Auditar({
    acao: AuditoriaAcao.CRIAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarCategoriaProdutoDto,
  ) {
    return this.categoriasProdutosService.criar(empresa.empresaId, body);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.categorias.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroCategoriasProdutosDto,
  ) {
    return this.categoriasProdutosService.listar(empresa.empresaId, filtros);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.categorias.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.categoriasProdutosService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.categorias.editar')
  @Auditar({
    acao: AuditoriaAcao.ATUALIZAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarCategoriaProdutoDto,
  ) {
    return this.categoriasProdutosService.atualizar(
      empresa.empresaId,
      id,
      body,
    );
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.categorias.editar')
  @Auditar({
    acao: AuditoriaAcao.ATIVAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  ativar(@EmpresaAtual() empresa: EmpresaContexto, @Param('id') id: string) {
    return this.categoriasProdutosService.ativar(empresa.empresaId, id);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.categorias.editar')
  @Auditar({
    acao: AuditoriaAcao.DESATIVAR,
    entidade: AuditoriaEntidade.CATEGORIA_PRODUTO,
  })
  desativar(@EmpresaAtual() empresa: EmpresaContexto, @Param('id') id: string) {
    return this.categoriasProdutosService.desativar(empresa.empresaId, id);
  }
}
