import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { InventariosEstoqueService } from './inventarios-estoque.service';

import { CriarInventarioEstoqueDto } from './dto/criar-inventario-estoque.dto';
import { AtualizarInventarioEstoqueDto } from './dto/atualizar-inventario-estoque.dto';
import { ContarItemInventarioDto } from './dto/contar-item-inventario.dto';
import { FiltroInventariosEstoqueDto } from './dto/filtro-inventarios-estoque.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
    @Req() req: any,
  ) {
    return this.inventariosEstoqueService.criar(
      body,
      req.user,
    );
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @Query() filtros: FiltroInventariosEstoqueDto,
    @Req() req: any,
  ) {
    return this.inventariosEstoqueService.listar(
      req.user,
      filtros,
    );
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.inventariosEstoqueService.buscarPorId(
      id,
      req.user,
    );
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarInventarioEstoqueDto,
    @Req() req: any,
  ) {
    return this.inventariosEstoqueService.atualizar(
      id,
      body,
      req.user,
    );
  }

  @Patch(':inventarioId/itens/:itemId/contagem')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  contarItem(
    @Param('inventarioId') inventarioId: string,
    @Param('itemId') itemId: string,
    @Body() body: ContarItemInventarioDto,
    @Req() req: any,
  ) {
    return this.inventariosEstoqueService.contarItem(
      inventarioId,
      itemId,
      body,
      req.user,
    );
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  cancelar(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.inventariosEstoqueService.cancelar(
      id,
      req.user,
    );
  }

  @Patch(':id/finalizar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  finalizar(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.inventariosEstoqueService.finalizar(
      id,
      req.user,
    );
  }
}