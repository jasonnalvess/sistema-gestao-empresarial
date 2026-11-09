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

import { InventariosEstoqueService } from './inventarios-estoque.service';
import { AtualizarInventarioEstoqueDto } from './dto/atualizar-inventario-estoque.dto';
import { ContarItemInventarioDto } from './dto/contar-item-inventario.dto';
import { CriarInventarioEstoqueDto } from './dto/criar-inventario-estoque.dto';
import { FiltroInventariosEstoqueDto } from './dto/filtro-inventarios-estoque.dto';

@Controller('inventarios-estoque')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class InventariosEstoqueController {
  constructor(
    private readonly inventariosEstoqueService: InventariosEstoqueService,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.inventarios.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarInventarioEstoqueDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.criar(
      empresa.empresaId,
      body,
      usuario,
    );
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.inventarios.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroInventariosEstoqueDto,
  ) {
    return this.inventariosEstoqueService.listar(empresa.empresaId, filtros);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.inventarios.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.inventariosEstoqueService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.inventarios.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarInventarioEstoqueDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.atualizar(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }

  @Patch(':inventarioId/itens/:itemId/contagem')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.inventarios.editar')
  contarItem(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('inventarioId') inventarioId: string,
    @Param('itemId') itemId: string,
    @Body() body: ContarItemInventarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.contarItem(
      empresa.empresaId,
      inventarioId,
      itemId,
      body,
      usuario,
    );
  }

  @Patch(':id/cancelar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.inventarios.cancelar')
  cancelar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.cancelar(
      empresa.empresaId,
      id,
      usuario,
    );
  }

  @Patch(':id/finalizar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.inventarios.finalizar')
  finalizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.finalizar(
      empresa.empresaId,
      id,
      usuario,
    );
  }
}
