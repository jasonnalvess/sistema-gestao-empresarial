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

import { ContasPagarService } from './contas-pagar.service';

import { AtualizarContaPagarDto } from './dto/atualizar-conta-pagar.dto';
import { CriarContaPagarDto } from './dto/criar-conta-pagar.dto';
import { CriarContaPagarHistoricoDto } from './dto/criar-conta-pagar-historico.dto';
import { FiltroContasPagarDto } from './dto/filtro-contas-pagar.dto';
import { GerarContaPedidoCompraDto } from './dto/gerar-conta-pedido-compra.dto';
import { RegistrarPagamentoContaPagarDto } from './dto/registrar-pagamento-conta-pagar.dto';

@Controller('contas-pagar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContasPagarController {
  constructor(private readonly contasPagarService: ContasPagarService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarContaPagarDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @Query() filtros: FiltroContasPagarDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.listar(usuario, filtros);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarContaPagarHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.adicionarHistorico(id, body, usuario);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.listarHistorico(id, usuario);
  }

  @Post(':id/pagamentos')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  registrarPagamento(
    @Param('id') id: string,
    @Body() body: RegistrarPagamentoContaPagarDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.registrarPagamento(id, body, usuario);
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  cancelar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.contasPagarService.cancelar(id, usuario);
  }

  @Post('pedido-compra/:pedidoCompraId')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  gerarAPartirPedidoCompra(
    @Param('pedidoCompraId') pedidoCompraId: string,
    @Body() body: GerarContaPedidoCompraDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.gerarAPartirPedidoCompra(
      pedidoCompraId,
      body,
      usuario,
    );
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarContaPagarDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.atualizar(id, body, usuario);
  }
}
