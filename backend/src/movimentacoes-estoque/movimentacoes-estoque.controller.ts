import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { MovimentacoesEstoqueService } from './movimentacoes-estoque.service';
import { CriarMovimentacaoEstoqueDto } from './dto/criar-movimentacao-estoque.dto';
import { CriarTransferenciaEstoqueDto } from './dto/criar-transferencia-estoque.dto';
import { FiltroMovimentacoesEstoqueDto } from './dto/filtro-movimentacoes-estoque.dto';

import { Auditar } from '../common/decorators/auditar.decorator';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';

@Controller('movimentacoes-estoque')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimentacoesEstoqueController {
  constructor(private readonly service: MovimentacoesEstoqueService) {}

  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.CRIAR,
    entidade: AuditoriaEntidade.MOVIMENTACAO_ESTOQUE,
  })
  criar(
    @Body() body: CriarMovimentacaoEstoqueDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.criar(body, usuario);
  }

  @Post('transferencias')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  transferir(
    @Body() body: CriarTransferenciaEstoqueDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.transferir(body, usuario);
  }

  @Get()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() filtros: FiltroMovimentacoesEstoqueDto,
  ) {
    return this.service.listar(usuario, filtros);
  }
}
