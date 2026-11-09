import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

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
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, EmpresaContextoGuard)
export class MovimentacoesEstoqueController {
  constructor(private readonly service: MovimentacoesEstoqueService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Auditar({
    acao: AuditoriaAcao.CRIAR,
    entidade: AuditoriaEntidade.MOVIMENTACAO_ESTOQUE,
  })
  criar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarMovimentacaoEstoqueDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.criar(empresa.empresaId, body, usuario);
  }

  @Post('transferencias')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.transferencias.realizar')
  transferir(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Body() body: CriarTransferenciaEstoqueDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.service.transferir(empresa.empresaId, body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @Permissoes('estoque.movimentacoes.visualizar')
  listar(
    @EmpresaAtual() empresa: EmpresaContexto,
    @Query() filtros: FiltroMovimentacoesEstoqueDto,
  ) {
    return this.service.listar(empresa.empresaId, filtros);
  }
}
