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
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';
import { MarcasProdutosService } from './marcas-produtos.service';
import { AtualizarMarcaProdutoDto } from './dto/atualizar-marca-produto.dto';
import { CriarMarcaProdutoDto } from './dto/criar-marca-produto.dto';

@Controller('marcas-produtos')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class MarcasProdutosController {
  constructor(private readonly marcasProdutosService: MarcasProdutosService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.marcas.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarMarcaProdutoDto,
  ) {
    return this.marcasProdutosService.criar(empresa.empresaId, body);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.marcas.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() paginacao: PaginacaoDto,
  ) {
    return this.marcasProdutosService.listar(empresa.empresaId, paginacao);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.marcas.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.marcasProdutosService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.marcas.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarMarcaProdutoDto,
  ) {
    return this.marcasProdutosService.atualizar(empresa.empresaId, id, body);
  }

  @Patch(':id/ativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.marcas.editar')
  ativar(@EmpresaAtual() empresa: EmpresaContexto, @Param('id') id: string) {
    return this.marcasProdutosService.ativar(empresa.empresaId, id);
  }

  @Patch(':id/desativar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.marcas.editar')
  desativar(@EmpresaAtual() empresa: EmpresaContexto, @Param('id') id: string) {
    return this.marcasProdutosService.desativar(empresa.empresaId, id);
  }
}
