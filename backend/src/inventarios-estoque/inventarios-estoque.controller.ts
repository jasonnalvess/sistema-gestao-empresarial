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

import { InventariosEstoqueService } from './inventarios-estoque.service';
import { AtualizarInventarioEstoqueDto } from './dto/atualizar-inventario-estoque.dto';
import { ContarItemInventarioDto } from './dto/contar-item-inventario.dto';
import { CriarInventarioEstoqueDto } from './dto/criar-inventario-estoque.dto';
import { FiltroInventariosEstoqueDto } from './dto/filtro-inventarios-estoque.dto';

@Controller('inventarios-estoque')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventariosEstoqueController {
  constructor(
    private readonly inventariosEstoqueService: InventariosEstoqueService,
  ) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarInventarioEstoqueDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @Query() filtros: FiltroInventariosEstoqueDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.listar(usuario, filtros);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarInventarioEstoqueDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.atualizar(id, body, usuario);
  }

  @Patch(':inventarioId/itens/:itemId/contagem')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  contarItem(
    @Param('inventarioId') inventarioId: string,
    @Param('itemId') itemId: string,
    @Body() body: ContarItemInventarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.contarItem(
      inventarioId,
      itemId,
      body,
      usuario,
    );
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  cancelar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.inventariosEstoqueService.cancelar(id, usuario);
  }

  @Patch(':id/finalizar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  finalizar(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.inventariosEstoqueService.finalizar(id, usuario);
  }
}
