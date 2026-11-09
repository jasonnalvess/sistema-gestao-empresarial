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

import { VendasService } from './vendas.service';

import { AtualizarVendaDto } from './dto/atualizar-venda.dto';
import { CancelarVendaDto } from './dto/cancelar-venda.dto';
import { CriarVendaDto } from './dto/criar-venda.dto';
import { CriarVendaHistoricoDto } from './dto/criar-venda-historico.dto';
import { FaturarVendaDto } from './dto/faturar-venda.dto';
import { FiltroDashboardVendasDto } from './dto/filtro-dashboard-vendas.dto';
import { FiltroVendasDto } from './dto/filtro-vendas.dto';

@Controller('vendas')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class VendasController {
  constructor(private readonly vendasService: VendasService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.criar')
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarVendaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.criar(empresa.empresaId, body, usuario.id);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroVendasDto,
  ) {
    return this.vendasService.listar(empresa.empresaId, filtros);
  }

  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.visualizar')
  dashboard(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroDashboardVendasDto,
  ) {
    return this.vendasService.dashboard(empresa.empresaId, filtros);
  }

  @Post(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.historico.adicionar')
  adicionarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: CriarVendaHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.adicionarHistorico(
      empresa.empresaId,
      id,
      body,
      usuario.id,
    );
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.visualizar')
  listarHistorico(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.vendasService.listarHistorico(empresa.empresaId, id);
  }

  @Patch(':id/enviar-aprovacao')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.editar')
  enviarParaAprovacao(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.enviarParaAprovacao(
      empresa.empresaId,
      id,
      usuario.id,
    );
  }

  @Patch(':id/aprovar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.aprovar')
  aprovar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.aprovar(empresa.empresaId, id, usuario.id);
  }

  @Patch(':id/faturar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.faturar')
  faturar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: FaturarVendaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.faturar(empresa.empresaId, id, body, usuario.id);
  }

  @Patch(':id/cancelar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.cancelar')
  cancelar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: CancelarVendaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.cancelar(empresa.empresaId, id, body, usuario.id);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.visualizar')
  buscarPorId(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
  ) {
    return this.vendasService.buscarPorId(empresa.empresaId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('vendas.editar')
  atualizar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Param('id') id: string,
    @Body() body: AtualizarVendaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.vendasService.atualizar(
      empresa.empresaId,
      id,
      body,
      usuario.id,
    );
  }
}
