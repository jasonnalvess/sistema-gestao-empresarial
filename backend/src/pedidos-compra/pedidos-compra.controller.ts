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

import { PedidosCompraService } from './pedidos-compra.service';
import { AtualizarPedidoCompraDto } from './dto/atualizar-pedido-compra.dto';
import { CriarPedidoCompraDto } from './dto/criar-pedido-compra.dto';
import { CriarPedidoCompraHistoricoDto } from './dto/criar-pedido-compra-historico.dto';
import { FiltroPedidosCompraDto } from './dto/filtro-pedidos-compra.dto';
import { ReceberPedidoCompraDto } from './dto/receber-pedido-compra.dto';

@Controller('pedidos-compra')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class PedidosCompraController {
  constructor(private readonly pedidosCompraService: PedidosCompraService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('pedidos_compra.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarPedidoCompraDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.criar(empresa.empresaId, body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('pedidos_compra.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroPedidosCompraDto,
  ) {
    return this.pedidosCompraService.listar(empresa.empresaId, filtros);
  }

  @Post(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('pedidos_compra.editar')
  adicionarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: CriarPedidoCompraHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.adicionarHistorico(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('pedidos_compra.visualizar')
  listarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.pedidosCompraService.listarHistorico(empresa.empresaId, id);
  }

  @Patch(':id/enviar-aprovacao')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('pedidos_compra.editar')
  enviarParaAprovacao(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.enviarParaAprovacao(
      empresa.empresaId,
      id,
      usuario,
    );
  }

  @Patch(':id/aprovar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA')
  @Permissoes('pedidos_compra.editar')
  aprovar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.aprovar(empresa.empresaId, id, usuario);
  }

  @Patch(':id/cancelar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('pedidos_compra.editar')
  cancelar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.cancelar(empresa.empresaId, id, usuario);
  }

  @Patch(':id/receber')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('pedidos_compra.editar')
  receber(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: ReceberPedidoCompraDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.receber(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('pedidos_compra.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.pedidosCompraService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('pedidos_compra.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarPedidoCompraDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.pedidosCompraService.atualizar(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }
}
