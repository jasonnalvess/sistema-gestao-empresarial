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

import { ContasPagarService } from './contas-pagar.service';

import { CriarContaPagarDto } from './dto/criar-conta-pagar.dto';
import { AtualizarContaPagarDto } from './dto/atualizar-conta-pagar.dto';
import { FiltroContasPagarDto } from './dto/filtro-contas-pagar.dto';
import { RegistrarPagamentoContaPagarDto } from './dto/registrar-pagamento-conta-pagar.dto';
import { CriarContaPagarHistoricoDto } from './dto/criar-conta-pagar-historico.dto';
import { GerarContaPedidoCompraDto } from './dto/gerar-conta-pedido-compra.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('contas-pagar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContasPagarController {
  constructor(
    private readonly contasPagarService: ContasPagarService,
  ) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarContaPagarDto,
    @Req() req: any,
  ) {
    return this.contasPagarService.criar(
      body,
      req.user,
    );
  }

  @Get()
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  listar(
    @Query() filtros: FiltroContasPagarDto,
    @Req() req: any,
  ) {
    return this.contasPagarService.listar(
      req.user,
      filtros,
    );
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarContaPagarHistoricoDto,
    @Req() req: any,
  ) {
    return this.contasPagarService.adicionarHistorico(
      id,
      body,
      req.user,
    );
  }

  @Get(':id/historico')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  listarHistorico(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.contasPagarService.listarHistorico(
      id,
      req.user,
    );
  }

  @Post(':id/pagamentos')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  registrarPagamento(
    @Param('id') id: string,
    @Body() body: RegistrarPagamentoContaPagarDto,
    @Req() req: any,
  ) {
    return this.contasPagarService.registrarPagamento(
      id,
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
    return this.contasPagarService.cancelar(
      id,
      req.user,
    );
  }

  @Post('pedido-compra/:pedidoCompraId')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  gerarAPartirPedidoCompra(
    @Param('pedidoCompraId') pedidoCompraId: string,
    @Body() body: GerarContaPedidoCompraDto,
    @Req() req: any,
  ) {
    return this.contasPagarService.gerarAPartirPedidoCompra(
      pedidoCompraId,
      body,
      req.user,
    );
  }

  @Get(':id')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  buscarPorId(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.contasPagarService.buscarPorId(
      id,
      req.user,
    );
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarContaPagarDto,
    @Req() req: any,
  ) {
    return this.contasPagarService.atualizar(
      id,
      body,
      req.user,
    );
  }
}
