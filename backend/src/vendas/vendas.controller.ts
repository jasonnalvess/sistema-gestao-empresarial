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

import { VendasService } from './vendas.service';

import { CriarVendaDto } from './dto/criar-venda.dto';
import { AtualizarVendaDto } from './dto/atualizar-venda.dto';
import { FiltroVendasDto } from './dto/filtro-vendas.dto';
import { FiltroDashboardVendasDto } from './dto/filtro-dashboard-vendas.dto';
import { CriarVendaHistoricoDto } from './dto/criar-venda-historico.dto';
import { FaturarVendaDto } from './dto/faturar-venda.dto';
import { CancelarVendaDto } from './dto/cancelar-venda.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('vendas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendasController {
  constructor(
    private readonly vendasService: VendasService,
  ) {}

  @Post()
  @Roles(
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  criar(
    @Body() body: CriarVendaDto,
    @Req() req: any,
  ) {
    return this.vendasService.criar(
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
    @Query() filtros: FiltroVendasDto,
    @Req() req: any,
  ) {
    return this.vendasService.listar(
      req.user,
      filtros,
    );
  }

  @Post(':id/historico')
  @Roles(
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarVendaHistoricoDto,
    @Req() req: any,
  ) {
    return this.vendasService.adicionarHistorico(
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
    return this.vendasService.listarHistorico(
      id,
      req.user,
    );
  }

  @Patch(':id/enviar-aprovacao')
  @Roles(
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  enviarParaAprovacao(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.vendasService.enviarParaAprovacao(
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
    return this.vendasService.aprovar(
      id,
      req.user,
    );
  }

  @Patch(':id/faturar')
  @Roles('ADMIN_EMPRESA')
  faturar(
    @Param('id') id: string,
    @Body() body: FaturarVendaDto,
    @Req() req: any,
  ) {
    return this.vendasService.faturar(
      id,
      body,
      req.user,
    );
  }

  @Patch(':id/cancelar')
  @Roles(
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  cancelar(
    @Param('id') id: string,
    @Body() body: CancelarVendaDto,
    @Req() req: any,
  ) {
    return this.vendasService.cancelar(
      id,
      body,
      req.user,
    );
  }

  @Get('dashboard')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  dashboard(
    @Req() req: any,
    @Query()
    filtros: FiltroDashboardVendasDto,
  ) {
    return this.vendasService.dashboard(
      req.user,
      filtros,
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
    return this.vendasService.buscarPorId(
      id,
      req.user,
    );
  }

  @Patch(':id')
  @Roles(
    'ADMIN_EMPRESA',
    'USUARIO_EMPRESA',
  )
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarVendaDto,
    @Req() req: any,
  ) {
    return this.vendasService.atualizar(
      id,
      body,
      req.user,
    );
  }
}