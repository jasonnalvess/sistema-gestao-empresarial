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

import { ContasPagarService } from './contas-pagar.service';
import { AtualizarContaPagarDto } from './dto/atualizar-conta-pagar.dto';
import { CriarContaPagarDto } from './dto/criar-conta-pagar.dto';
import { CriarContaPagarHistoricoDto } from './dto/criar-conta-pagar-historico.dto';
import { FiltroContasPagarDto } from './dto/filtro-contas-pagar.dto';
import { FiltroResumoContasPagarDto } from './dto/filtro-resumo-contas-pagar.dto';
import { GerarContaPedidoCompraDto } from './dto/gerar-conta-pedido-compra.dto';
import { RegistrarPagamentoContaPagarDto } from './dto/registrar-pagamento-conta-pagar.dto';

@Controller('contas-pagar')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class ContasPagarController {
  constructor(private readonly contasPagarService: ContasPagarService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_pagar.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarContaPagarDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.criar(empresa.empresaId, body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_pagar.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroContasPagarDto,
  ) {
    return this.contasPagarService.listar(empresa.empresaId, filtros);
  }

  @Get('resumo')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_pagar.visualizar')
  obterResumo(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroResumoContasPagarDto,
  ) {
    return this.contasPagarService.obterResumo(empresa.empresaId, filtros);
  }

  @Post(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_pagar.editar')
  adicionarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: CriarContaPagarHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.adicionarHistorico(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_pagar.visualizar')
  listarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.contasPagarService.listarHistorico(empresa.empresaId, id);
  }

  @Post(':id/pagamentos')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_pagar.pagar')
  registrarPagamento(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: RegistrarPagamentoContaPagarDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.registrarPagamento(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }

  @Patch(':id/cancelar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_pagar.cancelar')
  cancelar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.cancelar(empresa.empresaId, id, usuario);
  }

  @Post('pedido-compra/:pedidoCompraId')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_pagar.criar')
  gerarAPartirPedidoCompra(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('pedidoCompraId') pedidoCompraId: string,
    @Body() body: GerarContaPedidoCompraDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.gerarAPartirPedidoCompra(
      empresa.empresaId,
      pedidoCompraId,
      body,
      usuario,
    );
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_pagar.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.contasPagarService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('financeiro.contas_pagar.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarContaPagarDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasPagarService.atualizar(
      empresa.empresaId,
      id,
      body,
      usuario,
    );
  }
}
