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
import { Permissoes } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EmpresaAtual } from '../common/decorators/empresa-atual.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { EmpresaContexto } from '../common/types/empresa-contexto.type';

import { EstoqueService } from './estoque.service';
import { AtualizarEstoqueProdutoDto } from './dto/atualizar-estoque-produto.dto';
import { CriarEstoqueProdutoDto } from './dto/criar-estoque-produto.dto';
import { FiltroEstoqueDto } from './dto/filtro-estoque.dto';

@Controller('estoque')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.ajustes.realizar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarEstoqueProdutoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.estoqueService.criar(empresa.empresaId, body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroEstoqueDto,
  ) {
    return this.estoqueService.listar(empresa.empresaId, filtros);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.estoqueService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.ajustes.realizar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarEstoqueProdutoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.estoqueService.atualizar(empresa.empresaId, id, body, usuario);
  }
}
