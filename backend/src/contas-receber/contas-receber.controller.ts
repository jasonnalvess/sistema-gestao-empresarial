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

import { ContasReceberService } from './contas-receber.service';

import { AtualizarContaReceberDto } from './dto/atualizar-conta-receber.dto';
import { CriarContaReceberDto } from './dto/criar-conta-receber.dto';
import { CriarContaReceberHistoricoDto } from './dto/criar-conta-receber-historico.dto';
import { FiltroContasReceberDto } from './dto/filtro-contas-receber.dto';
import { GerarContaOrdemServicoDto } from './dto/gerar-conta-ordem-servico.dto';
import { RegistrarRecebimentoContaReceberDto } from './dto/registrar-recebimento-conta-receber.dto';

@Controller('contas-receber')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContasReceberController {
  constructor(private readonly contasReceberService: ContasReceberService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  criar(
    @Body() body: CriarContaReceberDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @Query() filtros: FiltroContasReceberDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.listar(usuario, filtros);
  }

  @Post(':id/historico')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  adicionarHistorico(
    @Param('id') id: string,
    @Body() body: CriarContaReceberHistoricoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.adicionarHistorico(id, body, usuario);
  }

  @Get(':id/historico')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarHistorico(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.listarHistorico(id, usuario);
  }

  @Post(':id/recebimentos')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  registrarRecebimento(
    @Param('id') id: string,
    @Body() body: RegistrarRecebimentoContaReceberDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.registrarRecebimento(id, body, usuario);
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  cancelar(@Param('id') id: string, @CurrentUser() usuario: AuthenticatedUser) {
    return this.contasReceberService.cancelar(id, usuario);
  }

  @Post('ordem-servico/:ordemServicoId')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  gerarAPartirOrdemServico(
    @Param('ordemServicoId') ordemServicoId: string,
    @Body() body: GerarContaOrdemServicoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.gerarAPartirOrdemServico(
      ordemServicoId,
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
    return this.contasReceberService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarContaReceberDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.contasReceberService.atualizar(id, body, usuario);
  }
}
