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

import { PedidosCompraService } from './pedidos-compra.service';

import { AtualizarPedidoCompraDto } from './dto/atualizar-pedido-compra.dto';
import { CriarPedidoCompraDto } from './dto/criar-pedido-compra.dto';
import { CriarPedidoCompraHistoricoDto } from './dto/criar-pedido-compra-historico.dto';
import { FiltroPedidosCompraDto } from './dto/filtro-pedidos-compra.dto';
import { ReceberPedidoCompraDto } from './dto/receber-pedido-compra.dto';

@Controller('pedidos-compra')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PedidosCompraController {
  constructor(private readonly pedidosCompraService: PedidosCompraService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarPedidoCompraDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @Query() filtros: FiltroPedidosCompraDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.listar(usuario, filtros);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarPedidoCompraHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.adicionarHistorico(id, body, usuario);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.listarHistorico(id, usuario);
  }

  @Patch(':id/enviar-aprovacao')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  enviarParaAprovacao(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.enviarParaAprovacao(id, usuario);
  }

  @Patch(':id/aprovar')
  @Roles('ADMIN_EMPRESA')
  aprovar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.pedidosCompraService.aprovar(id, usuario);
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  cancelar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.pedidosCompraService.cancelar(id, usuario);
  }

  @Patch(':id/receber')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  receber(
    @Param('id') id: string,
    @Body() body: ReceberPedidoCompraDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.receber(id, body, usuario);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarPedidoCompraDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.atualizar(id, body, usuario);
  }
}
