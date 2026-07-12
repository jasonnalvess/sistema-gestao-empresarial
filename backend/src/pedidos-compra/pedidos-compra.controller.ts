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

import { PedidosCompraService } from './pedidos-compra.service';

import { CriarPedidoCompraDto } from './dto/criar-pedido-compra.dto';
import { AtualizarPedidoCompraDto } from './dto/atualizar-pedido-compra.dto';
import { FiltroPedidosCompraDto } from './dto/filtro-pedidos-compra.dto';
import { CriarPedidoCompraHistoricoDto } from './dto/criar-pedido-compra-historico.dto';
import { ReceberPedidoCompraDto } from './dto/receber-pedido-compra.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('pedidos-compra')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PedidosCompraController {
  constructor(
    private readonly pedidosCompraService: PedidosCompraService,
  ) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarPedidoCompraDto,
    @Req() req: any,
  ) {
    return this.pedidosCompraService.criar(
      body,
      req.user,
    );
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @Query() filtros: FiltroPedidosCompraDto,
    @Req() req: any,
  ) {
    return this.pedidosCompraService.listar(
      req.user,
      filtros,
    );
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarPedidoCompraHistoricoDto,
    @Req() req: any,
  ) {
    return this.pedidosCompraService.adicionarHistorico(
      id,
      body,
      req.user,
    );
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.pedidosCompraService.listarHistorico(
      id,
      req.user,
    );
  }

  @Patch(':id/enviar-aprovacao')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  enviarParaAprovacao(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.pedidosCompraService.enviarParaAprovacao(
      id,
      req.user,
    );
  }

  @Patch(':id/aprovar')
  @Roles('ADMIN_EMPRESA')
  aprovar(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.pedidosCompraService.aprovar(
      id,
      req.user,
    );
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  cancelar(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.pedidosCompraService.cancelar(
      id,
      req.user,
    );
  }

  @Patch(':id/receber')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  receber(
    @Param('id') id: string,
    @Body() body: ReceberPedidoCompraDto,
    @Req() req: any,
  ) {
    return this.pedidosCompraService.receber(
      id,
      body,
      req.user,
    );
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.pedidosCompraService.buscarPorId(
      id,
      req.user,
    );
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarPedidoCompraDto,
    @Req() req: any,
  ) {
    return this.pedidosCompraService.atualizar(
      id,
      body,
      req.user,
    );
  }
}
