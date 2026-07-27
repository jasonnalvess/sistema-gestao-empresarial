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

import { OrdensServicoService } from './ordens-servico.service';
import { AlterarStatusOrdemServicoDto } from './dto/alterar-status-ordem-servico.dto';
import { CriarOrdemServicoDto } from './dto/criar-ordem-servico.dto';
import { CriarOrdemServicoHistoricoDto } from './dto/criar-ordem-servico-historico.dto';
import { FiltroOrdensServicoDto } from './dto/filtro-ordens-servico.dto';

@Controller('ordens-servico')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarOrdemServicoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() paginacao: FiltroOrdensServicoDto,
  ) {
    return this.ordensServicoService.listar(usuario, paginacao);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarOrdemServicoHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.adicionarHistorico(id, body, usuario);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.listarHistorico(id, usuario);
  }

  @Patch(':id/status')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  alterarStatus(
    @Param('id') id: string,
    @Body() body: AlterarStatusOrdemServicoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.alterarStatus(id, body, usuario);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.buscarPorId(id, usuario);
  }
}
