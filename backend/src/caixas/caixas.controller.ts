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

import { CaixasService } from './caixas.service';

import { CriarCaixaDto } from './dto/criar-caixa.dto';
import { AtualizarCaixaDto } from './dto/atualizar-caixa.dto';
import { AbrirCaixaDto } from './dto/abrir-caixa.dto';
import { FecharCaixaDto } from './dto/fechar-caixa.dto';
import { CriarMovimentacaoCaixaDto } from './dto/criar-movimentacao-caixa.dto';
import { FiltroCaixasDto } from './dto/filtro-caixas.dto';
import { FiltroMovimentacoesCaixaDto } from './dto/filtro-movimentacoes-caixa.dto';
import { FiltroResumoCaixasDto } from './dto/filtro-resumo-caixas.dto';

@Controller('caixas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CaixasController {
  constructor(private readonly caixasService: CaixasService) {}

  @Post()
  @Roles('ADMIN_EMPRESA')
  criar(
    @Body() body: CriarCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.criar(body, usuario);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listar(
    @Query() filtros: FiltroCaixasDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.listar(usuario, filtros);
  }

  @Get('resumo/geral')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  resumo(
    @Query() filtros: FiltroResumoCaixasDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.resumo(usuario, filtros);
  }

  @Get('movimentacoes/listar')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarMovimentacoes(
    @Query() filtros: FiltroMovimentacoesCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.listarMovimentacoes(usuario, filtros);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.buscarPorId(id, usuario);
  }

  @Patch(':id')
  @Roles('ADMIN_EMPRESA')
  atualizar(
    @Param('id') id: string,
    @Body() body: AtualizarCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.atualizar(id, body, usuario);
  }

  @Post(':id/abrir')
  @Roles('ADMIN_EMPRESA')
  abrir(
    @Param('id') id: string,
    @Body() body: AbrirCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.abrir(id, body, usuario);
  }

  @Post(':id/fechar')
  @Roles('ADMIN_EMPRESA')
  fechar(
    @Param('id') id: string,
    @Body() body: FecharCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.fechar(id, body, usuario);
  }

  @Get(':id/abertura')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  aberturaAtual(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.buscarAberturaAtiva(id, usuario);
  }

  @Get(':id/aberturas')
  @Roles('SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  listarAberturas(
    @Param('id') id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.listarAberturas(id, usuario);
  }

  @Post(':id/movimentacoes')
  @Roles('ADMIN_EMPRESA')
  movimentar(
    @Param('id') id: string,
    @Body() body: CriarMovimentacaoCaixaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.caixasService.criarMovimentacao(id, body, usuario);
  }
}
