import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import { OrdensServicoService } from './ordens-servico.service';
import { CriarOrdemServicoDto } from './dto/criar-ordem-servico.dto';
import { CriarOrdemServicoHistoricoDto } from './dto/criar-ordem-servico-historico.dto';
import { AlterarStatusOrdemServicoDto } from './dto/alterar-status-ordem-servico.dto';
import { FiltroOrdensServicoDto } from './dto/filtro-ordens-servico.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('ordens-servico')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(@Body() body: CriarOrdemServicoDto, @Req() req: any) {
    return this.ordensServicoService.criar(body, req.user);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(@Req() req: any, @Query() paginacao: FiltroOrdensServicoDto) {
    return this.ordensServicoService.listar(req.user, paginacao);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarOrdemServicoHistoricoDto,
    @Req() req: any,
  ) {
    return this.ordensServicoService.adicionarHistorico(id, body, req.user);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(@Param('id') id: string, @Req() req: any) {
    return this.ordensServicoService.listarHistorico(id, req.user);
  }

  @Patch(':id/status')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  alterarStatus(
    @Param('id') id: string,
    @Body() body: AlterarStatusOrdemServicoDto,
    @Req() req: any,
  ) {
    return this.ordensServicoService.alterarStatus(id, body, req.user);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(@Param('id') id: string, @Req() req: any) {
    return this.ordensServicoService.buscarPorId(id, req.user);
  }
}
