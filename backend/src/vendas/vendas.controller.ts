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

import { VendasService } from './vendas.service';

import { AtualizarVendaDto } from './dto/atualizar-venda.dto';
import { CancelarVendaDto } from './dto/cancelar-venda.dto';
import { CriarVendaDto } from './dto/criar-venda.dto';
import { CriarVendaHistoricoDto } from './dto/criar-venda-historico.dto';
import { FaturarVendaDto } from './dto/faturar-venda.dto';
import { FiltroDashboardVendasDto } from './dto/filtro-dashboard-vendas.dto';
import { FiltroVendasDto } from './dto/filtro-vendas.dto';

@Controller('vendas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendasController {
  constructor(private readonly vendasService: VendasService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarVendaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @Query() filtros: FiltroVendasDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.listar(usuario, filtros);
  }

  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  dashboard(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() filtros: FiltroDashboardVendasDto,
  ) {
    return this.vendasService.dashboard(usuario, filtros);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarVendaHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.adicionarHistorico(id, body, usuario);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.listarHistorico(id, usuario);
  }

  @Patch(':id/enviar-aprovacao')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  enviarParaAprovacao(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.enviarParaAprovacao(id, usuario);
  }

  @Patch(':id/aprovar')
  @Roles('ADMIN_EMPRESA')
  aprovar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.vendasService.aprovar(id, usuario);
  }

  @Patch(':id/faturar')
  @Roles('ADMIN_EMPRESA')
  faturar(
    @Param('id') id: string,
    @Body() body: FaturarVendaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.faturar(id, body, usuario);
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  cancelar(
    @Param('id') id: string,
    @Body() body: CancelarVendaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.cancelar(id, body, usuario);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarVendaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.atualizar(id, body, usuario);
  }
}
